//! A crew is a Sputnik DAO. The vault records who joined. It does not pay the split.

use crate::state::*;
use crate::{VaultContract, VaultContractExt};
use near_sdk::{env, ext_contract, near, require, AccountId, Gas, NearToken, Promise, PromiseError};

const GAS_POLICY: Gas = Gas::from_tgas(30);
const GAS_JOINED: Gas = Gas::from_tgas(40);
const SHARE_WHOLE: u128 = 10_000;

#[allow(dead_code)]
#[ext_contract(ext_dao)]
trait ExtDao {
    fn get_policy(&self);
}

#[allow(dead_code)]
#[ext_contract(ext_crew_cb)]
trait ExtCrewCb {
    fn on_crew_joined(
        &mut self,
        vault_id: String,
        round: u64,
        crew: AccountId,
        member: AccountId,
        claim_pk: Vec<u8>,
    );
}

#[near]
impl VaultContract {
    pub fn get_crew(&self, vault_id: String, round: u64, crew: AccountId) -> Vec<AccountId> {
        let key = CrewKey { vault_id, round, crew };
        match self.v1_ref().crews.get(&key) {
            Some(record) => record.seats.iter().map(|seat| seat.member.clone()).collect(),
            None => Vec::new(),
        }
    }

    /// Asks the DAO for its policy. A failed read records nothing. The callback does.
    pub fn join_crew(&mut self, vault_id: String, round: u64, crew: AccountId, claim_pk: Vec<u8>) -> Promise {
        require_id(&vault_id);
        require!(claim_pk.len() == 32, "bad key");
        let vault = self.take_vault(&vault_id);
        require!(round == vault.round, "round");
        let member = env::predecessor_account_id();
        ext_dao::ext(crew.clone())
            .with_static_gas(GAS_POLICY)
            .with_attached_deposit(NearToken::from_yoctonear(0))
            .get_policy()
            .then(
                ext_crew_cb::ext(env::current_account_id())
                    .with_static_gas(GAS_JOINED)
                    .on_crew_joined(vault_id, round, crew, member, claim_pk),
            )
    }

    #[private]
    pub fn on_crew_joined(
        &mut self,
        vault_id: String,
        round: u64,
        crew: AccountId,
        member: AccountId,
        claim_pk: Vec<u8>,
        #[callback_result] policy: Result<near_sdk::serde_json::Value, PromiseError>,
    ) {
        let policy = match policy {
            Ok(value) => value,
            Err(_) => return,
        };
        let Some(council) = council_accounts(&policy) else {
            return;
        };
        let Some(vault) = self.v1_ref().vaults.get(&vault_id).cloned() else {
            return;
        };
        if round != vault.round {
            return;
        }
        if council.iter().any(|account| account == &vault.sponsor || account == &self.v1_ref().owner) {
            env::panic_str("refused");
        }
        if !council.iter().any(|account| account == &member) {
            return;
        }
        if claim_pk.len() != 32 {
            return;
        }
        let mut key_bytes = [0u8; 32];
        key_bytes.copy_from_slice(&claim_pk);
        let crew_key = CrewKey {
            vault_id: vault_id.clone(),
            round,
            crew: crew.clone(),
        };
        let mut record = self.v1().crews.get(&crew_key).cloned().unwrap_or(CrewRecord { seats: Vec::new() });
        if record.seats.iter().any(|seat| seat.member == member) {
            return;
        }
        require!(record.seats.len() < 4, "crew full");
        let spent_claim = SpentClaimKey {
            vault_id: vault_id.clone(),
            round,
            claim_pk: key_bytes,
        };
        require!(!self.v1().spent_claims.contains_key(&spent_claim), "claim key");
        record.seats.push(CrewSeat { member: member.clone(), claim_pk: key_bytes });
        self.v1().crews.insert(crew_key, record);
        self.v1().spent_claims.insert(spent_claim, true);
        self.v1().spent_members.insert(
            SpentMemberKey { vault_id, round, member: member.to_string() },
            true,
        );
    }
}

impl VaultContract {
    pub(crate) fn reject_spent_crew(&self, vault_id: &str, round: u64, player_id: &str, claim_pk: &[u8; 32]) {
        let state = self.v1_ref();
        require!(
            !state.spent_members.contains_key(&SpentMemberKey {
                vault_id: vault_id.to_string(),
                round,
                member: player_id.to_string(),
            }),
            "crew member"
        );
        require!(
            !state.spent_claims.contains_key(&SpentClaimKey {
                vault_id: vault_id.to_string(),
                round,
                claim_pk: *claim_pk,
            }),
            "claim key"
        );
        if let Ok(crew) = player_id.parse::<AccountId>() {
            if let Some(record) = state.crews.get(&CrewKey {
                vault_id: vault_id.to_string(),
                round,
                crew,
            }) {
                let size = record.seats.len();
                require!(size >= 2 && size <= 4, "crew");
            }
        }
    }
}

/// Equal integer shares. A remainder that does not divide stays unallocated.
#[allow(dead_code)]
pub(crate) fn even_split(amount: u128, members: u32) -> Vec<u128> {
    require!((2..=4).contains(&members), "crew");
    let each = amount / u128::from(members);
    vec![each; members as usize]
}

/// `parts` are basis points and must sum to 10_000. Flooring leaves the remainder unallocated.
#[allow(dead_code)]
pub(crate) fn policy_shares(amount: u128, parts: &[u128]) -> Vec<u128> {
    let sum = parts.iter().try_fold(0u128, |total, part| total.checked_add(*part));
    let sum = sum.unwrap_or_else(|| env::panic_str("overflow"));
    require!(sum == SHARE_WHOLE, "shares");
    parts
        .iter()
        .map(|part| {
            amount
                .checked_mul(*part)
                .unwrap_or_else(|| env::panic_str("overflow"))
                / SHARE_WHOLE
        })
        .collect()
}

fn council_accounts(policy: &near_sdk::serde_json::Value) -> Option<Vec<AccountId>> {
    let body = policy.get("Current").unwrap_or(policy);
    let roles = body.get("roles")?.as_array()?;
    for role in roles {
        if role.get("name").and_then(|name| name.as_str()) != Some("council") {
            continue;
        }
        let group = role.get("kind")?.get("Group")?.as_array()?;
        let mut accounts = Vec::new();
        for account in group {
            let text = account.as_str()?;
            accounts.push(text.parse().ok()?);
        }
        return Some(accounts);
    }
    None
}
