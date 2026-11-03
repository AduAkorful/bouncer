//! USDC vault. One wasm, many vault records, plus `isolate` for a sponsor subaccount.
//! Payout is the `Payout` trait. This wasm's only implementation is testnet Circle USDC.

mod accounting;
mod crew;
mod events;
mod factory;
mod migrate;
mod payout;
mod state;
mod tickets;
mod verdict;

pub use state::*;

use near_sdk::{env, near, require, AccountId, Gas, NearToken, PanicOnDefault, Promise};
use payout::UsdcPayout;

#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct VaultContract {
    pub(crate) state: State,
}

#[near]
impl VaultContract {
    #[init]
    pub fn init(owner: AccountId, fee_bps: u16) -> Self {
        require_fee_bps(fee_bps);
        Self { state: State::V1(StateV1::new(owner, fee_bps)) }
    }

    pub fn get_owner(&self) -> AccountId {
        self.v1_ref().owner.clone()
    }

    pub fn get_fee_bps(&self) -> u16 {
        self.v1_ref().fee_bps
    }

    pub fn get_fee_balance(&self) -> u128 {
        self.v1_ref().fee_balance
    }

    pub fn get_accounted(&self) -> u128 {
        self.v1_ref().accounted
    }

    pub fn get_vault(&self, vault_id: String) -> Option<Vault> {
        self.v1_ref().vaults.get(&vault_id).cloned()
    }

    pub fn get_crack(&self, vault_id: String, round: u64, raid_id: String) -> Option<Crack> {
        self.v1_ref()
            .cracks
            .get(&CrackKey { vault_id, round, raid_id })
            .cloned()
    }

    pub fn get_factory_code_hash(&self) -> Option<[u8; 32]> {
        self.v1_ref().factory_code_hash
    }

    pub fn get_usdc_account(&self) -> AccountId {
        usdc_account()
    }

    pub fn set_fee_bps(&mut self, fee_bps: u16) {
        self.assert_owner();
        require_fee_bps(fee_bps);
        self.v1().fee_bps = fee_bps;
    }

    /// Owner NEAR withdrawal. Cannot spend the storage stake or the gas float.
    pub fn withdraw_near(&mut self, amount: u128) -> Promise {
        self.assert_owner();
        require!(amount > 0, "amount");
        let amount = NearToken::from_yoctonear(amount);
        let held = env::account_balance()
            .checked_sub(env::attached_deposit())
            .unwrap_or_else(|| env::panic_str("balance"));
        let left = held.checked_sub(amount).unwrap_or_else(|| env::panic_str("near float"));
        require!(left >= self.minimum_near(), "near float");
        Promise::new(self.v1_ref().owner.clone()).transfer(amount)
    }
}

impl VaultContract {
    pub(crate) fn v1(&mut self) -> &mut StateV1 {
        match &mut self.state {
            State::V1(state) => state,
        }
    }

    pub(crate) fn v1_ref(&self) -> &StateV1 {
        match &self.state {
            State::V1(state) => state,
        }
    }

    pub(crate) fn assert_owner(&self) {
        require!(env::predecessor_account_id() == self.v1_ref().owner, "not owner");
    }

    pub(crate) fn take_vault(&mut self, id: &str) -> Vault {
        match self.v1().vaults.get(id).cloned() {
            Some(vault) => vault,
            None => env::panic_str("no vault"),
        }
    }

    pub(crate) fn put_vault(&mut self, id: &str, vault: Vault) {
        self.v1().vaults.insert(id.to_string(), vault);
    }

    pub(crate) fn minimum_near(&self) -> NearToken {
        let stake = env::storage_byte_cost().saturating_mul(u128::from(env::storage_usage()));
        stake.saturating_add(NearToken::from_yoctonear(NEAR_FLOAT))
    }

    pub(crate) fn require_payout_gas(&self) {
        require!(env::prepaid_gas() >= Gas::from_tgas(280), "gas");
    }

    pub(crate) fn payout(&self) -> UsdcPayout {
        UsdcPayout
    }
}

#[cfg(test)]
mod tests;
