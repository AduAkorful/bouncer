use crate::events;
use crate::payout::Payout;
use crate::state::*;
use crate::{VaultContract, VaultContractExt};
use near_sdk::{env, near, require, AccountId};

#[near]
impl VaultContract {
    pub fn set_guard_key(&mut self, vault_id: String, guard_pk: Vec<u8>) {
        self.assert_owner();
        require!(guard_pk.len() == 32, "bad key");
        let mut key = [0u8; 32];
        key.copy_from_slice(&guard_pk);
        let mut vault = self.take_vault(&vault_id);
        require!(!vault.open, "door open");
        let applies = if vault.closed_pending_bump {
            vault.round.checked_add(1).unwrap_or_else(|| env::panic_str("overflow"))
        } else {
            vault.round
        };
        vault.guard_pk = Some(key);
        self.put_vault(&vault_id, vault);
        events::guard_key_set(&vault_id, applies, &key);
    }

    pub fn submit_verdict(&mut self, verdict: VerdictMessage, signature: Vec<u8>) {
        require!(env::predecessor_account_id() != self.v1_ref().owner, "not owner");
        if signature.len() < 64 {
            env::panic_str("truncated signature");
        }
        require!(signature.len() == 64, "bad signature");
        let mut sig = [0u8; 64];
        sig.copy_from_slice(&signature);
        require_id(&verdict.vault_id);
        require_id(&verdict.raid_id);
        require_id(&verdict.player_id);

        let mut vault = self.take_vault(&verdict.vault_id);
        let now = env::block_timestamp();
        require!(verdict.round == vault.round, "round");
        require!(vault.open, "not open");
        require!(now >= vault.opens_at, "too early");
        require!(now < vault.closes_at, "too late");
        require!(vault.commitment.is_some(), "no commitment");
        let guard_pk = match vault.guard_pk {
            Some(key) => key,
            None => env::panic_str("no guard"),
        };
        let round_version = match vault.guard_version {
            Some(version) => version,
            None => env::panic_str("no guard"),
        };
        require!(
            env::ed25519_verify(&sig, verdict_bytes(&verdict), &guard_pk),
            "bad signature"
        );
        require!(verdict.guard_version == round_version, "guard version");
        require!(vault.crack_count < vault.max_cracks, "round full");

        let crack_key = CrackKey {
            vault_id: verdict.vault_id.clone(),
            round: verdict.round,
            raid_id: verdict.raid_id.clone(),
        };
        require!(!self.v1().cracks.contains_key(&crack_key), "raid exists");
        let bill_key = BillKey {
            vault_id: verdict.vault_id.clone(),
            round: verdict.round,
            player_id: verdict.player_id.clone(),
            bill_hash: verdict.bill_hash,
        };
        require!(!self.v1().bills.contains_key(&bill_key), "bill exists");
        let player_key = PlayerKey {
            vault_id: verdict.vault_id.clone(),
            round: verdict.round,
            player_id: verdict.player_id.clone(),
        };
        require!(!self.v1().players.contains_key(&player_key), "player exists");
        self.reject_spent_crew(&verdict.vault_id, verdict.round, &verdict.player_id, &verdict.claim_pk);

        let pred = env::predecessor_account_id();
        if vault.ticketed {
            let left = self.admission(&verdict.vault_id, verdict.round, &pred);
            require!(left >= 1, "no ticket");
        }

        match vault.rule {
            PayoutRule::PayTheBill => {
                require!(verdict.amount > 0, "zero amount");
                require!(verdict.amount <= vault.cap, "above cap");
                require!(verdict.amount <= vault.day_pot, "above day pot");
                vault.day_pot = sub(vault.day_pot, verdict.amount);
                vault.reserved = add(vault.reserved, verdict.amount);
            }
            PayoutRule::SplitTheDay => require!(verdict.amount == 0, "nonzero amount"),
        }

        if vault.ticketed {
            self.consume_admission(&verdict.vault_id, verdict.round, &pred);
        }
        let status = match vault.rule {
            PayoutRule::PayTheBill => CrackStatus::Reserved,
            PayoutRule::SplitTheDay => CrackStatus::Recorded,
        };
        let unlock_at = match vault.rule {
            PayoutRule::PayTheBill => {
                now.checked_add(vault.lock_ns).unwrap_or_else(|| env::panic_str("overflow"))
            }
            PayoutRule::SplitTheDay => 0,
        };
        let index = vault.crack_count;
        vault.crack_count = index.checked_add(1).unwrap_or_else(|| env::panic_str("overflow"));
        self.v1().raid_index.insert(
            RaidIndexKey {
                vault_id: verdict.vault_id.clone(),
                round: verdict.round,
                index,
            },
            verdict.raid_id.clone(),
        );
        self.v1().players.insert(player_key, true);
        self.v1().bills.insert(bill_key, true);
        self.v1().cracks.insert(
            crack_key,
            Crack {
                player_id: verdict.player_id,
                claim_pk: verdict.claim_pk,
                bill_hash: verdict.bill_hash,
                conversation_hash: verdict.conversation_hash,
                guard_version: verdict.guard_version,
                amount: verdict.amount,
                recorded_at: now,
                unlock_at,
                expires_at: now.checked_add(GUEST_HOLD_NS).unwrap_or_else(|| env::panic_str("overflow")),
                status,
            },
        );
        self.put_vault(&verdict.vault_id, vault);
    }

    pub fn claim(
        &mut self,
        vault_id: String,
        round: u64,
        raid_id: String,
        payout: AccountId,
        claim_sig: Vec<u8>,
    ) {
        self.require_payout_gas();
        if claim_sig.len() < 64 {
            env::panic_str("truncated signature");
        }
        require!(claim_sig.len() == 64, "bad signature");
        let mut sig = [0u8; 64];
        sig.copy_from_slice(&claim_sig);
        require!(env::predecessor_account_id() == payout, "payout mismatch");

        let mut vault = self.take_vault(&vault_id);
        let key = CrackKey {
            vault_id: vault_id.clone(),
            round,
            raid_id: raid_id.clone(),
        };
        let mut crack = self
            .v1()
            .cracks
            .get(&key)
            .cloned()
            .unwrap_or_else(|| env::panic_str("no crack"));
        let now = env::block_timestamp();
        require!(now >= crack.unlock_at, "too early to claim");
        require!(now <= crack.expires_at, "claim expired");
        require!(crack.amount > 0, "zero amount");
        let message = claim_bytes(&vault_id, round, &raid_id, payout.as_str());
        require!(env::ed25519_verify(&sig, message, &crack.claim_pk), "bad claim signature");

        match crack.status {
            CrackStatus::Reserved | CrackStatus::Settled => {}
            CrackStatus::Failed => self.take_retry(&mut vault, crack.amount),
            _ => env::panic_str("not claimable"),
        }
        crack.status = CrackStatus::Pending;
        let amount = crack.amount;
        self.v1().cracks.insert(key, crack);
        self.put_vault(&vault_id, vault);
        self.payout()
            .transfer(payout, amount, Outflow::Claim { vault_id, round, raid_id })
            .detach();
    }

    pub fn expire(&mut self, vault_id: String, round: u64, raid_id: String) {
        let mut vault = self.take_vault(&vault_id);
        let key = CrackKey {
            vault_id: vault_id.clone(),
            round,
            raid_id,
        };
        let mut crack = self
            .v1()
            .cracks
            .get(&key)
            .cloned()
            .unwrap_or_else(|| env::panic_str("no crack"));
        require!(env::block_timestamp() > crack.expires_at, "not expired");
        match crack.status {
            CrackStatus::Paid | CrackStatus::Expired | CrackStatus::Pending => {
                env::panic_str("not expirable")
            }
            CrackStatus::Reserved | CrackStatus::Settled => {
                self.release_reserved(&mut vault, crack.amount);
                crack.status = CrackStatus::Expired;
            }
            CrackStatus::Failed | CrackStatus::Recorded => {
                crack.status = CrackStatus::Expired;
            }
        }
        self.v1().cracks.insert(key, crack);
        self.put_vault(&vault_id, vault);
    }
}

impl VaultContract {
    fn admission(&mut self, vault_id: &str, round: u64, account: &AccountId) -> u32 {
        self.v1()
            .admissions
            .get(&AdmissionKey {
                vault_id: vault_id.to_string(),
                round,
                account: account.to_string(),
            })
            .copied()
            .unwrap_or(0)
    }

    fn consume_admission(&mut self, vault_id: &str, round: u64, account: &AccountId) {
        let key = AdmissionKey {
            vault_id: vault_id.to_string(),
            round,
            account: account.to_string(),
        };
        let left = self.v1().admissions.get(&key).copied().unwrap_or(0);
        require!(left >= 1, "no ticket");
        self.v1().admissions.insert(key, left - 1);
    }

    fn take_retry(&mut self, vault: &mut Vault, amount: u128) {
        if vault.open {
            require!(vault.day_pot >= amount, "short pot");
            vault.day_pot = sub(vault.day_pot, amount);
        } else {
            require!(vault.pot >= amount, "short pot");
            vault.pot = sub(vault.pot, amount);
        }
        vault.reserved = add(vault.reserved, amount);
    }
}

pub(crate) fn verdict_bytes(verdict: &VerdictMessage) -> Vec<u8> {
    domain_bytes(VERDICT_DOMAIN, verdict)
}

pub(crate) fn claim_bytes(vault_id: &str, round: u64, raid_id: &str, payout: &str) -> Vec<u8> {
    domain_bytes(
        CLAIM_DOMAIN,
        &ClaimMessage {
            vault_id: vault_id.to_string(),
            round,
            raid_id: raid_id.to_string(),
            payout: payout.to_string(),
        },
    )
}

/// What the guard signs for a round. `round` is the round that will open.
pub(crate) fn commit_bytes(vault_id: &str, round: u64, commitment: [u8; 32], guard_version: [u8; 32]) -> Vec<u8> {
    domain_bytes(COMMIT_DOMAIN, &CommitMessage { vault_id: vault_id.to_string(), round, commitment, guard_version })
}
