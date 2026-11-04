//! What a sponsor can do without the owner: create a vault inside the owner's limits, seal a story
//! onto it, name a keeper, and take the pot back. The owner keeps the limits, the default guard key,
//! and a switch that blocks new rounds.

use crate::events;
use crate::factory::blank_vault;
use crate::state::*;
use crate::{VaultContract, VaultContractExt};
use near_sdk::json_types::Base64VecU8;
use near_sdk::{env, near, require, AccountId, NearToken, Promise, PromiseOrValue};

const MAX_LIST: u32 = 100;
const MAX_PREFIXES: usize = 16;
const MAX_PREFIX_LEN: usize = 32;

#[near]
impl VaultContract {
    pub fn get_limits(&self) -> Limits {
        self.v1_ref().limits.clone()
    }

    /// Vault ids in creation order. The keeper pages through these.
    pub fn list_vaults(&self, from_index: u32, limit: u32) -> Vec<String> {
        let ids = &self.v1_ref().vault_ids;
        let end = from_index.saturating_add(limit.min(MAX_LIST)).min(ids.len());
        (from_index..end).filter_map(|i| ids.get(i).cloned()).collect()
    }

    pub fn get_spec(&self, vault_id: String) -> Option<Base64VecU8> {
        self.v1_ref().specs.get(&vault_id).map(|ct| Base64VecU8::from(ct.clone()))
    }

    pub fn set_limits(&mut self, limits: Limits) {
        self.assert_owner();
        require!(limits.max_cap > 0 && limits.max_cracks > 0, "limits");
        require!(limits.min_lock_ns >= MIN_LOCK_NS && limits.min_lock_ns <= limits.max_lock_ns, "limits");
        require!(limits.max_lock_ns < GUEST_HOLD_NS, "limits");
        require!(limits.max_open_lead_ns > 0 && limits.max_spec_ct > 0 && limits.max_card > 0, "limits");
        require!(limits.reserved_prefixes.len() <= MAX_PREFIXES, "limits");
        require!(limits.reserved_prefixes.iter().all(|p| !p.is_empty() && p.len() <= MAX_PREFIX_LEN), "limits");
        let default_guard_pk = self.v1_ref().limits.default_guard_pk;
        self.v1().limits = Limits { default_guard_pk, ..limits };
    }

    /// New vaults take this key. A vault that already exists keeps its own.
    pub fn set_default_guard_key(&mut self, guard_pk: Vec<u8>) {
        self.assert_owner();
        require!(guard_pk.len() == 32, "bad key");
        let mut key = [0u8; 32];
        key.copy_from_slice(&guard_pk);
        self.v1().limits.default_guard_pk = Some(key);
    }

    /// Blocks `commit_round` for one vault. Funds and `reclaim` are untouched.
    pub fn suspend_vault(&mut self, vault_id: String, suspended: bool) {
        self.assert_owner();
        let mut vault = self.take_vault(&vault_id);
        vault.suspended = suspended;
        self.put_vault(&vault_id, vault);
    }

    /// The caller is the sponsor. The attached NEAR pays the storage this call adds, and any excess
    /// comes back.
    #[payable]
    pub fn create_sponsor_vault(
        &mut self,
        vault_id: String,
        rule: PayoutRule,
        cap: u128,
        lock_ns: u64,
        max_cracks: u32,
    ) -> PromiseOrValue<()> {
        let limits = self.v1_ref().limits.clone();
        require!(limits.self_serve, "closed");
        let guard_pk = limits.default_guard_pk.unwrap_or_else(|| env::panic_str("no guard"));
        require_id(&vault_id);
        require!(!limits.reserved_prefixes.iter().any(|p| vault_id.starts_with(p.as_str())), "reserved id");
        require!(cap > 0 && cap <= limits.max_cap, "cap");
        require!(lock_ns >= limits.min_lock_ns && lock_ns <= limits.max_lock_ns, "lock");
        require!(max_cracks >= 1 && max_cracks <= limits.max_cracks, "max cracks");
        if rule == PayoutRule::PayTheBill {
            let _ = u128::from(max_cracks)
                .checked_mul(cap)
                .unwrap_or_else(|| env::panic_str("day budget"));
        }
        require!(self.v1().vaults.get(&vault_id).is_none(), "vault exists");
        let sponsor = env::predecessor_account_id();
        let before = env::storage_usage();
        let mut vault = blank_vault(sponsor.clone(), rule, cap, lock_ns, max_cracks, None, false);
        vault.guard_pk = Some(guard_pk);
        self.v1().vault_ids.push(vault_id.clone());
        self.v1().vaults.insert(vault_id.clone(), vault);
        self.v1().vaults.flush();
        self.v1().vault_ids.flush();
        events::vault_created(&vault_id, sponsor.as_str());
        self.settle_storage(before, &sponsor)
    }

    /// Seal the story onto the vault. Only until the first round, because a late reveal needs the
    /// same story the round ran under.
    #[payable]
    pub fn set_spec(&mut self, vault_id: String, spec_ct: Base64VecU8, spec_hash: [u8; 32], card: String) -> PromiseOrValue<()> {
        let mut vault = self.take_vault(&vault_id);
        let sponsor = env::predecessor_account_id();
        require!(sponsor == vault.sponsor, "not sponsor");
        require!(!vault.open, "door open");
        require!(!vault.spec_locked, "spec locked");
        let limits = self.v1_ref().limits.clone();
        let ct = spec_ct.0;
        require!(!ct.is_empty() && ct.len() <= limits.max_spec_ct as usize, "spec size");
        require!(!card.trim().is_empty() && card.len() <= limits.max_card as usize, "card size");
        require!(!card.chars().any(|c| c.is_control()), "card text");
        let before = env::storage_usage();
        vault.spec_hash = Some(spec_hash);
        vault.card = Some(card);
        self.put_vault(&vault_id, vault);
        self.v1().specs.insert(vault_id.clone(), ct);
        self.v1().vaults.flush();
        self.v1().specs.flush();
        events::spec_set(&vault_id, &spec_hash);
        self.settle_storage(before, &sponsor)
    }

    /// A keeper opens and closes rounds. It cannot fund, withdraw, or change anything else.
    pub fn set_keeper(&mut self, vault_id: String, keeper: Option<AccountId>) {
        let mut vault = self.take_vault(&vault_id);
        require!(env::predecessor_account_id() == vault.sponsor, "not sponsor");
        events::keeper_set(&vault_id, keeper.as_ref().map(|k| k.as_str()));
        vault.keeper = keeper;
        self.put_vault(&vault_id, vault);
    }

    /// The sponsor takes the unspent pot back between rounds. A vault with a challenge end uses
    /// `end_challenge` instead.
    pub fn reclaim(&mut self, vault_id: String) {
        self.require_payout_gas();
        let vault = self.take_vault(&vault_id);
        require!(env::predecessor_account_id() == vault.sponsor, "not sponsor");
        require!(!vault.open, "door open");
        require!(vault.challenge_end.is_none(), "challenge");
        require!(vault.reserved == 0, "reserved remains");
        require!(vault.refund_in_flight == 0, "refund pending");
        self.refund_pot(&vault_id, vault);
    }
}

impl VaultContract {
    /// The writes are flushed before this runs, so `storage_usage` has moved. A short deposit panics
    /// and the whole call rolls back.
    fn settle_storage(&self, before: u64, payer: &AccountId) -> PromiseOrValue<()> {
        let added = env::storage_usage().saturating_sub(before);
        let cost = env::storage_byte_cost().saturating_mul(u128::from(added));
        let attached = env::attached_deposit();
        require!(attached >= cost, "attach near");
        let excess = attached.saturating_sub(cost);
        if excess > NearToken::from_yoctonear(0) {
            PromiseOrValue::Promise(Promise::new(payer.clone()).transfer(excess))
        } else {
            PromiseOrValue::Value(())
        }
    }
}
