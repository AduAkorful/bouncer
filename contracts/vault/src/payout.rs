//! USDC is the only `Payout` implementation. Callers move books, then call the trait.
//! They do not name `ft_transfer`.

use crate::state::*;
use crate::{VaultContract, VaultContractExt};
use near_sdk::json_types::U128;
use near_sdk::{env, ext_contract, near, require, AccountId, Gas, NearToken, Promise, PromiseError};

const GAS_READ: Gas = Gas::from_tgas(20);
const GAS_AFTER_READ: Gas = Gas::from_tgas(180);
const GAS_RECOVER_CB: Gas = Gas::from_tgas(220);
const GAS_REGISTER: Gas = Gas::from_tgas(30);
const GAS_TRANSFER: Gas = Gas::from_tgas(30);
const GAS_DONE: Gas = Gas::from_tgas(40);
const ONE_YOCTO: NearToken = NearToken::from_yoctonear(1);

#[near(serializers = [json])]
pub struct StorageBalance {
    pub total: U128,
    pub available: U128,
}

#[allow(dead_code)]
#[ext_contract(ext_usdc)]
trait ExtUsdc {
    fn ft_transfer(&mut self, receiver_id: AccountId, amount: U128, memo: Option<String>);
    fn storage_deposit(&mut self, account_id: Option<AccountId>, registration_only: Option<bool>);
    fn storage_balance_of(&self, account_id: AccountId) -> Option<StorageBalance>;
    fn ft_balance_of(&self, account_id: AccountId) -> U128;
}

#[allow(dead_code)]
#[ext_contract(ext_vault)]
trait ExtVault {
    fn on_storage_checked(&mut self, to: AccountId, amount: U128, outflow: Outflow);
    fn on_transfer_done(&mut self, outflow: Outflow, amount: U128);
    fn on_recover_balance(&mut self, to: AccountId, amount: U128);
}

pub trait Payout {
    fn transfer(&self, to: AccountId, amount: u128, outflow: Outflow) -> Promise;
    fn recover_uncredited(&self, to: AccountId, amount: u128) -> Promise;
}

pub struct UsdcPayout;

impl Payout for UsdcPayout {
    fn transfer(&self, to: AccountId, amount: u128, outflow: Outflow) -> Promise {
        let balance = ext_usdc::ext(usdc_account())
            .with_static_gas(GAS_READ)
            .storage_balance_of(to.clone());
        // `then` targets the vault; `ext_on` would append the call to the token's receipt, where it does not exist.
        balance.then(
            ext_vault::ext(env::current_account_id())
                .with_static_gas(GAS_AFTER_READ)
                .on_storage_checked(to, U128(amount), outflow),
        )
    }

    fn recover_uncredited(&self, to: AccountId, amount: u128) -> Promise {
        let balance = ext_usdc::ext(usdc_account())
            .with_static_gas(GAS_READ)
            .ft_balance_of(env::current_account_id());
        balance.then(
            ext_vault::ext(env::current_account_id())
                .with_static_gas(GAS_RECOVER_CB)
                .on_recover_balance(to, U128(amount)),
        )
    }
}

#[near]
impl VaultContract {
    #[private]
    pub fn on_storage_checked(
        &mut self,
        to: AccountId,
        amount: U128,
        outflow: Outflow,
        #[callback_result] balance: Result<Option<StorageBalance>, PromiseError>,
    ) {
        if balance.is_err() {
            self.settle(&outflow, amount.0, false);
            return;
        }
        require!(amount.0 > 0, "amount");
        let registered = matches!(balance, Ok(Some(_)));
        let transfer = if registered {
            usdc_transfer(to, amount)
        } else {
            let register = ext_usdc::ext(usdc_account())
                .with_attached_deposit(NearToken::from_yoctonear(STORAGE_DEPOSIT))
                .with_static_gas(GAS_REGISTER)
                .storage_deposit(Some(to.clone()), Some(true));
            ext_usdc::ext_on(register)
                .with_attached_deposit(ONE_YOCTO)
                .with_static_gas(GAS_TRANSFER)
                .ft_transfer(to, amount, None)
        };
        transfer
            .then(
                ext_vault::ext(env::current_account_id())
                    .with_static_gas(GAS_DONE)
                    .on_transfer_done(outflow, amount),
            )
            .detach();
    }

    #[private]
    pub fn on_transfer_done(
        &mut self,
        outflow: Outflow,
        amount: U128,
        #[callback_result] result: Result<(), PromiseError>,
    ) {
        self.settle(&outflow, amount.0, result.is_ok());
    }

    #[private]
    pub fn on_recover_balance(
        &mut self,
        to: AccountId,
        amount: U128,
        #[callback_result] balance: Result<U128, PromiseError>,
    ) {
        let balance = match balance {
            Ok(value) => value.0,
            Err(_) => env::panic_str("balance"),
        };
        let accounted = self.v1().accounted;
        let surplus = balance.checked_sub(accounted).unwrap_or(0);
        require!(amount.0 <= surplus, "surplus");
        self.payout().transfer(to, amount.0, Outflow::Recover).detach();
    }
}

fn usdc_transfer(to: AccountId, amount: U128) -> Promise {
    ext_usdc::ext(usdc_account())
        .with_attached_deposit(ONE_YOCTO)
        .with_static_gas(GAS_TRANSFER)
        .ft_transfer(to, amount, None)
}
