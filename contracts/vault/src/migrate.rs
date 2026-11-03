//! Owner-only upgrade. The wasm is the raw input, then `migrate` runs on this account.
//! An isolated sponsor account uses the same method. Its owner is its own predecessor.

use crate::state::State;
use crate::{VaultContract, VaultContractExt};
use near_sdk::{env, near, require, Gas, NearToken, Promise};

#[near]
impl VaultContract {
    pub fn update_contract(&self) -> Promise {
        self.assert_owner();
        let code = env::input().unwrap_or_else(|| env::panic_str("no wasm"));
        require!(!code.is_empty(), "no wasm");
        Promise::new(env::current_account_id()).deploy_contract(code).function_call(
            "migrate",
            Vec::new(),
            NearToken::from_yoctonear(0),
            Gas::from_tgas(30),
        )
    }

    #[private]
    #[init(ignore_state)]
    pub fn migrate() -> Self {
        let old: VaultContract = env::state_read().unwrap_or_else(|| env::panic_str("no state"));
        match old.state {
            State::V1(state) => Self { state: State::V1(state) },
        }
    }
}
