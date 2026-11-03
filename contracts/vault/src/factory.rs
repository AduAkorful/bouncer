//! Registry vaults live in this account. `isolate` deploys a copy of the published wasm
//! onto `<sponsor>.<this>` and calls `init` in the same receipt. The runtime does not
//! expose the running wasm, so the owner publishes that blob once. The factory does not
//! keep a key that can upgrade the child. Global contracts are not used.

use crate::state::*;
use crate::{VaultContract, VaultContractExt};
use near_sdk::json_types::Base64VecU8;
use near_sdk::{env, near, require, AccountId, Gas, NearToken, Promise, PublicKey};

const FACTORY_WASM_KEY: &[u8] = b"bouncer.factory.wasm.v1";

#[near(serializers = [json])]
pub struct IsolateInit {
    pub owner: AccountId,
    pub owner_pk: PublicKey,
    pub fee_bps: u16,
}

#[near]
impl VaultContract {
    pub fn create_vault(
        &mut self,
        vault_id: String,
        sponsor: AccountId,
        rule: PayoutRule,
        cap: u128,
        lock_ns: u64,
        max_cracks: u32,
        challenge_end: Option<u64>,
        ticketed: bool,
    ) {
        self.assert_owner();
        require_id(&vault_id);
        require!(cap > 0, "cap");
        require_lock(lock_ns);
        require!(max_cracks >= 1, "max cracks");
        if rule == PayoutRule::PayTheBill {
            let _ = u128::from(max_cracks)
                .checked_mul(cap)
                .unwrap_or_else(|| env::panic_str("day budget"));
        }
        require!(self.v1().vaults.get(&vault_id).is_none(), "vault exists");
        self.v1().vaults.insert(
            vault_id,
            Vault {
                sponsor,
                pot: 0,
                day_pot: 0,
                reserved: 0,
                cap,
                lock_ns,
                rule,
                guard_pk: None,
                commitment: None,
                guard_version: None,
                round: 1,
                opens_at: 0,
                closes_at: 0,
                open: false,
                challenge_end,
                max_cracks,
                ticketed,
                closed_pending_bump: false,
                refund_in_flight: 0,
                crack_count: 0,
            },
        );
    }

    pub fn publish_wasm(&mut self, code: Base64VecU8) {
        self.assert_owner();
        let code = code.0;
        require!(code.len() > 4, "wasm");
        env::storage_write(FACTORY_WASM_KEY, &code);
        let stored = env::storage_read(FACTORY_WASM_KEY).unwrap_or_else(|| env::panic_str("wasm store"));
        require!(stored == code, "wasm store");
        self.v1().factory_code_hash = Some(env::sha256_array(&code));
    }

    #[payable]
    pub fn isolate(&mut self, sponsor_name: String, init_args: IsolateInit) -> Promise {
        self.assert_owner();
        require_fee_bps(init_args.fee_bps);
        let code = env::storage_read(FACTORY_WASM_KEY).unwrap_or_else(|| env::panic_str("no wasm"));
        require!(
            Some(env::sha256_array(&code)) == self.v1_ref().factory_code_hash,
            "no wasm"
        );
        let child = child_account(&sponsor_name);
        let deposit = env::attached_deposit();
        let code_cost = env::storage_byte_cost().saturating_mul(code.len() as u128);
        let min = code_cost.saturating_add(NearToken::from_yoctonear(NEAR_FLOAT));
        require!(deposit >= min, "attach near");
        let args = format!(
            "{{\"owner\":\"{}\",\"fee_bps\":{}}}",
            init_args.owner, init_args.fee_bps
        )
        .into_bytes();
        Promise::new(child)
            .create_account()
            .transfer(deposit)
            .add_full_access_key(init_args.owner_pk)
            .deploy_contract(code)
            .function_call("init", args, NearToken::from_yoctonear(0), Gas::from_tgas(30))
    }
}

fn child_account(sponsor_name: &str) -> AccountId {
    let ok = (2..=32).contains(&sponsor_name.len())
        && sponsor_name
            .bytes()
            .all(|b| b.is_ascii_lowercase() || b.is_ascii_digit() || matches!(b, b'-' | b'_'))
        && !sponsor_name.starts_with('-')
        && !sponsor_name.ends_with('-');
    require!(ok, "bad account");
    let parent = env::current_account_id();
    let full = format!("{sponsor_name}.{parent}");
    require!(full.len() <= 64, "bad account");
    full.parse().unwrap_or_else(|_| env::panic_str("bad account"))
}
