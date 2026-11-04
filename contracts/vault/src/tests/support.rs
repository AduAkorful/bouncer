use ed25519_dalek::{Signer, SigningKey};
use near_sdk::json_types::U128;
use near_sdk::mock::MockAction;
use near_sdk::test_utils::{get_created_receipts, VMContextBuilder};
use near_sdk::{testing_env, AccountId, Gas, NearToken, PromiseOrValue};
use std::rc::Rc;

use crate::state::*;
use crate::verdict::{claim_bytes, verdict_bytes};
use crate::VaultContract;

pub const CONTRACT: &str = "vault.test.near";
pub const OWNER: &str = "owner.test.near";
pub const SPONSOR: &str = "sponsor.test.near";
pub const PLAYER: &str = "player.test.near";

pub fn id(name: &str) -> AccountId {
    name.parse().unwrap()
}

pub fn hash(n: u8) -> [u8; 32] {
    let mut out = [0u8; 32];
    out[0] = n;
    out
}

pub struct Key {
    signing: SigningKey,
}

impl Key {
    pub fn from_seed(seed: u8) -> Self {
        Self { signing: SigningKey::from_bytes(&[seed; 32]) }
    }

    pub fn pk(&self) -> [u8; 32] {
        self.signing.verifying_key().to_bytes()
    }

    pub fn sign(&self, message: &[u8]) -> Vec<u8> {
        self.signing.sign(message).to_bytes().to_vec()
    }
}

pub struct World {
    pub contract: VaultContract,
}

impl World {
    pub fn new(fee_bps: u16) -> Self {
        // A new contract must not see another test's trie. `testing_env!` keeps storage.
        let _ = near_sdk::mock::with_mocked_blockchain(|chain| chain.take_storage());
        switch(OWNER, 0, NearToken::from_yoctonear(0), NearToken::from_near(50));
        Self { contract: VaultContract::init(id(OWNER), fee_bps) }
    }

    pub fn at(&mut self, predecessor: &str, now: u64) {
        switch(predecessor, now, NearToken::from_yoctonear(0), NearToken::from_near(50));
    }
}

pub fn switch(predecessor: &str, now: u64, attached: NearToken, balance: NearToken) {
    let context = VMContextBuilder::new()
        .current_account_id(id(CONTRACT))
        .predecessor_account_id(id(predecessor))
        .signer_account_id(id(predecessor))
        .block_timestamp(now)
        .prepaid_gas(Gas::from_tgas(1_000))
        .account_balance(balance)
        .attached_deposit(attached)
        .build();
    testing_env!(context);
}

pub fn with_input(predecessor: &str, input: &[u8]) {
    let mut context = VMContextBuilder::new()
        .current_account_id(id(CONTRACT))
        .predecessor_account_id(id(predecessor))
        .signer_account_id(id(predecessor))
        .prepaid_gas(Gas::from_tgas(1_000))
        .account_balance(NearToken::from_near(50))
        .build();
    context.input = Rc::from(input);
    testing_env!(context);
}

pub struct Door {
    pub world: World,
    pub guard: Key,
    pub claim: Key,
    pub vault_id: String,
}

pub fn pay_door() -> Door {
    door(PayoutRule::PayTheBill, false, 0)
}

pub fn split_door() -> Door {
    door(PayoutRule::SplitTheDay, false, 0)
}

pub fn door(rule: PayoutRule, ticketed: bool, fee_bps: u16) -> Door {
    let mut world = World::new(fee_bps);
    let guard = Key::from_seed(1);
    let claim = Key::from_seed(2);
    world.contract.create_vault(
        "velvet".into(),
        id(SPONSOR),
        rule,
        1_000_000,
        MIN_LOCK_NS,
        4,
        Some(0),
        ticketed,
    );
    world.contract.set_guard_key("velvet".into(), guard.pk().to_vec());
    let returned = deposit(&mut world, "velvet", &id(SPONSOR), 10_000_000, 0);
    assert_eq!(returned, 0);
    world.at(OWNER, 0);
    commit(&mut world, &guard, "velvet", hash(9), hash(8), 0);
    Door { world, guard, claim, vault_id: "velvet".into() }
}

/// Opens the next round the way the guard would: sign the commitment and version for the round that
/// will open, then call `commit_round` as whoever the world is currently acting as.
pub fn commit(world: &mut World, guard: &Key, vault: &str, commitment: [u8; 32], version: [u8; 32], opens_at: u64) {
    let current = world.contract.get_vault(vault.to_string()).unwrap();
    let round = if current.closed_pending_bump { current.round + 1 } else { current.round };
    let signature = guard.sign(&crate::verdict::commit_bytes(vault, round, commitment, version));
    world.contract.commit_round(vault.to_string(), commitment, version, opens_at, signature);
}

pub fn deposit(world: &mut World, vault: &str, sender: &AccountId, amount: u128, now: u64) -> u128 {
    world.at(USDC_ACCOUNT, now);
    match world.contract.ft_on_transfer(sender.clone(), U128(amount), vault.to_string()) {
        PromiseOrValue::Value(value) => value.0,
        PromiseOrValue::Promise(_) => panic!("deposit returned a promise"),
    }
}

pub fn books(contract: &VaultContract, ids: &[&str]) {
    let state = contract.v1_ref();
    let mut sum = state.fee_balance + state.fee_in_flight;
    for id in ids {
        let vault = state.vaults.get(&(*id).to_string()).expect("vault");
        sum += vault.pot + vault.day_pot + vault.reserved + vault.refund_in_flight;
    }
    assert_eq!(sum, state.accounted, "books");
}

impl Door {
    pub fn vault(&self) -> Vault {
        self.world.contract.get_vault(self.vault_id.clone()).unwrap()
    }

    pub fn verdict(&self, raid: &str, player: &str, amount: u128, bill: u8) -> VerdictMessage {
        VerdictMessage {
            vault_id: self.vault_id.clone(),
            round: self.vault().round,
            raid_id: raid.into(),
            player_id: player.into(),
            bill_hash: hash(bill),
            amount,
            claim_pk: self.claim.pk(),
            conversation_hash: hash(4),
            guard_version: hash(8),
        }
    }

    pub fn submit_as(&mut self, predecessor: &str, verdict: VerdictMessage, now: u64) {
        let signature = self.guard.sign(&verdict_bytes(&verdict));
        self.world.at(predecessor, now);
        self.world.contract.submit_verdict(verdict, signature);
    }

    pub fn submit(&mut self, raid: &str, player: &str, amount: u128, bill: u8, now: u64) {
        let verdict = self.verdict(raid, player, amount, bill);
        self.submit_as(player, verdict, now);
    }

    pub fn crack(&self, round: u64, raid: &str) -> Crack {
        self.world.contract.get_crack(self.vault_id.clone(), round, raid.into()).unwrap()
    }
}

pub fn sign_claim(key: &Key, vault: &str, round: u64, raid: &str, payout: &str) -> Vec<u8> {
    key.sign(&claim_bytes(vault, round, raid, payout))
}

pub struct Call {
    pub method: String,
    pub deposit: NearToken,
}

pub fn calls() -> Vec<Call> {
    let mut out = Vec::new();
    for receipt in get_created_receipts() {
        for action in receipt.actions {
            if let MockAction::FunctionCallWeight { method_name, attached_deposit, .. } = action {
                out.push(Call {
                    method: String::from_utf8(method_name).unwrap(),
                    deposit: attached_deposit,
                });
            }
        }
    }
    out
}
