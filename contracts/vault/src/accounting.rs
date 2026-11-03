use crate::payout::Payout;
use crate::state::*;
use crate::{VaultContract, VaultContractExt};
use near_sdk::json_types::U128;
use near_sdk::{env, near, require, AccountId, PromiseOrValue};

#[near]
impl VaultContract {
    /// Sponsor deposit. `msg` is the vault id. Any other token or sender is returned whole.
    pub fn ft_on_transfer(
        &mut self,
        sender_id: AccountId,
        amount: U128,
        msg: String,
    ) -> PromiseOrValue<U128> {
        let amount = amount.0;
        if env::predecessor_account_id() != usdc_account() {
            return PromiseOrValue::Value(U128(amount));
        }
        let fee_bps = self.v1().fee_bps;
        let Some(mut vault) = self.v1().vaults.get(&msg).cloned() else {
            return PromiseOrValue::Value(U128(amount));
        };
        if sender_id != vault.sponsor {
            return PromiseOrValue::Value(U128(amount));
        }
        let (fee, net) = split_fee(amount, fee_bps);
        vault.pot = add(vault.pot, net);
        let fee_balance = add(self.v1().fee_balance, fee);
        let accounted = add(self.v1().accounted, amount);
        let state = self.v1();
        state.fee_balance = fee_balance;
        state.accounted = accounted;
        state.vaults.insert(msg, vault);
        PromiseOrValue::Value(U128(0))
    }

    pub fn withdraw_fees(&mut self, receiver_id: AccountId, amount: u128) {
        self.assert_owner();
        self.require_payout_gas();
        require!(amount > 0, "amount");
        require!(receiver_id != env::current_account_id(), "bad receiver");
        let balance = self.v1().fee_balance;
        require!(amount <= balance, "fee balance");
        let in_flight = self.v1().fee_in_flight;
        self.v1().fee_balance = sub(balance, amount);
        self.v1().fee_in_flight = add(in_flight, amount);
        self.payout().transfer(receiver_id, amount, Outflow::Fee).detach();
    }

    pub fn recover_uncredited(&mut self, receiver_id: AccountId, amount: u128) {
        self.assert_owner();
        self.require_payout_gas();
        require!(amount > 0, "amount");
        require!(receiver_id != env::current_account_id(), "bad receiver");
        self.payout().recover_uncredited(receiver_id, amount).detach();
    }

    pub fn set_cap(&mut self, vault_id: String, cap: u128) {
        self.assert_owner();
        require!(cap > 0, "cap");
        let mut vault = self.take_vault(&vault_id);
        require!(!vault.open, "door open");
        if vault.rule == PayoutRule::PayTheBill {
            let _ = u128::from(vault.max_cracks)
                .checked_mul(cap)
                .unwrap_or_else(|| env::panic_str("day budget"));
        }
        vault.cap = cap;
        self.put_vault(&vault_id, vault);
    }

    pub fn set_lock(&mut self, vault_id: String, lock_ns: u64) {
        self.assert_owner();
        require_lock(lock_ns);
        let mut vault = self.take_vault(&vault_id);
        require!(!vault.open, "door open");
        vault.lock_ns = lock_ns;
        self.put_vault(&vault_id, vault);
    }

    pub fn commit_round(
        &mut self,
        vault_id: String,
        commitment: [u8; 32],
        guard_version: [u8; 32],
        opens_at: u64,
    ) {
        let mut vault = self.take_vault(&vault_id);
        let pred = env::predecessor_account_id();
        require!(pred == self.v1_ref().owner || pred == vault.sponsor, "not sponsor");
        require!(!vault.open, "door open");
        require!(vault.guard_pk.is_some(), "no guard");
        if vault.closed_pending_bump {
            vault.round = vault.round.checked_add(1).unwrap_or_else(|| env::panic_str("overflow"));
            vault.closed_pending_bump = false;
        }
        let budget = match vault.rule {
            PayoutRule::PayTheBill => u128::from(vault.max_cracks)
                .checked_mul(vault.cap)
                .unwrap_or_else(|| env::panic_str("day budget")),
            PayoutRule::SplitTheDay => vault.pot,
        };
        require!(budget > 0, "day budget");
        let moved = budget.min(vault.pot);
        require!(moved > 0, "empty pot");
        let closes_at = next_utc_midnight(opens_at);
        require!(closes_at > env::block_timestamp(), "closes at");
        vault.pot = sub(vault.pot, moved);
        vault.day_pot = add(vault.day_pot, moved);
        vault.commitment = Some(commitment);
        vault.guard_version = Some(guard_version);
        vault.opens_at = opens_at;
        vault.closes_at = closes_at;
        vault.open = true;
        vault.crack_count = 0;
        self.put_vault(&vault_id, vault);
    }

    pub fn close_round(&mut self, vault_id: String) {
        let mut vault = self.take_vault(&vault_id);
        require!(vault.open, "not open");
        let now = env::block_timestamp();
        let early = env::predecessor_account_id() == self.v1_ref().owner;
        require!(early || now >= vault.closes_at, "too early");
        if vault.rule == PayoutRule::SplitTheDay {
            self.settle_split(&vault_id, &mut vault, now);
        }
        vault.pot = add(vault.pot, vault.day_pot);
        vault.day_pot = 0;
        vault.open = false;
        vault.commitment = None;
        vault.guard_version = None;
        vault.closed_pending_bump = true;
        vault.crack_count = 0;
        self.put_vault(&vault_id, vault);
    }

    pub fn end_challenge(&mut self, vault_id: String) {
        self.require_payout_gas();
        let mut vault = self.take_vault(&vault_id);
        require!(env::predecessor_account_id() == vault.sponsor, "not sponsor");
        require!(!vault.open, "door open");
        require!(vault.reserved == 0, "reserved remains");
        require!(vault.refund_in_flight == 0, "refund pending");
        let end = vault.challenge_end.unwrap_or_else(|| env::panic_str("no challenge end"));
        require!(env::block_timestamp() >= end, "too early");
        let amount = add(vault.pot, vault.day_pot);
        require!(amount > 0, "empty");
        vault.pot = 0;
        vault.day_pot = 0;
        vault.refund_in_flight = amount;
        let sponsor = vault.sponsor.clone();
        self.put_vault(&vault_id, vault);
        self.payout().transfer(sponsor, amount, Outflow::Refund { vault_id }).detach();
    }
}

impl VaultContract {
    fn settle_split(&mut self, vault_id: &str, vault: &mut Vault, now: u64) {
        let mut recorded = Vec::new();
        for index in 0..vault.crack_count {
            let raid_id = self
                .v1()
                .raid_index
                .get(&RaidIndexKey {
                    vault_id: vault_id.to_string(),
                    round: vault.round,
                    index,
                })
                .cloned()
                .unwrap_or_else(|| env::panic_str("raid index"));
            let key = CrackKey {
                vault_id: vault_id.to_string(),
                round: vault.round,
                raid_id: raid_id.clone(),
            };
            let mut crack = self
                .v1()
                .cracks
                .get(&key)
                .cloned()
                .unwrap_or_else(|| env::panic_str("no crack"));
            if crack.status == CrackStatus::Recorded && now <= crack.expires_at {
                recorded.push(raid_id);
            } else if crack.status == CrackStatus::Recorded {
                crack.status = CrackStatus::Expired;
                self.v1().cracks.insert(key, crack);
            }
        }
        if recorded.is_empty() {
            return;
        }
        let count = recorded.len() as u128;
        let share = (vault.day_pot / count).min(vault.cap);
        let distributed = share.checked_mul(count).unwrap_or_else(|| env::panic_str("overflow"));
        require!(distributed <= vault.day_pot, "split");
        let unlock_at = now.checked_add(vault.lock_ns).unwrap_or_else(|| env::panic_str("overflow"));
        for raid_id in recorded {
            let key = CrackKey {
                vault_id: vault_id.to_string(),
                round: vault.round,
                raid_id,
            };
            let mut crack = self.v1().cracks.get(&key).cloned().unwrap_or_else(|| env::panic_str("no crack"));
            crack.amount = share;
            crack.status = CrackStatus::Settled;
            crack.unlock_at = unlock_at;
            self.v1().cracks.insert(key, crack);
        }
        vault.day_pot = sub(vault.day_pot, distributed);
        vault.reserved = add(vault.reserved, distributed);
    }

    pub(crate) fn settle(&mut self, outflow: &Outflow, amount: u128, ok: bool) {
        if ok {
            self.succeed(outflow, amount);
        } else {
            self.fail(outflow, amount);
        }
    }

    fn succeed(&mut self, outflow: &Outflow, amount: u128) {
        match outflow {
            Outflow::Claim { vault_id, round, raid_id } => {
                let mut vault = self.take_vault(vault_id);
                let mut crack = self.take_pending(vault_id, *round, raid_id, amount);
                vault.reserved = sub(vault.reserved, amount);
                crack.status = CrackStatus::Paid;
                let accounted = self.v1().accounted;
                self.v1().accounted = sub(accounted, amount);
                self.v1().cracks.insert(
                    CrackKey {
                        vault_id: vault_id.clone(),
                        round: *round,
                        raid_id: raid_id.clone(),
                    },
                    crack,
                );
                self.put_vault(vault_id, vault);
            }
            Outflow::Fee => {
                let in_flight = self.v1().fee_in_flight;
                require!(amount <= in_flight, "fee in flight");
                let accounted = self.v1().accounted;
                self.v1().fee_in_flight = sub(in_flight, amount);
                self.v1().accounted = sub(accounted, amount);
            }
            Outflow::Refund { vault_id } => {
                let mut vault = self.take_vault(vault_id);
                require!(amount == vault.refund_in_flight, "refund");
                vault.refund_in_flight = 0;
                let accounted = self.v1().accounted;
                self.v1().accounted = sub(accounted, amount);
                self.put_vault(vault_id, vault);
            }
            Outflow::Recover => {}
        }
    }

    fn fail(&mut self, outflow: &Outflow, amount: u128) {
        match outflow {
            Outflow::Claim { vault_id, round, raid_id } => {
                let mut vault = self.take_vault(vault_id);
                let mut crack = self.take_pending(vault_id, *round, raid_id, amount);
                vault.reserved = sub(vault.reserved, amount);
                if vault.open {
                    vault.day_pot = add(vault.day_pot, amount);
                } else {
                    vault.pot = add(vault.pot, amount);
                }
                crack.status = CrackStatus::Failed;
                self.v1().cracks.insert(
                    CrackKey {
                        vault_id: vault_id.clone(),
                        round: *round,
                        raid_id: raid_id.clone(),
                    },
                    crack,
                );
                self.put_vault(vault_id, vault);
            }
            Outflow::Fee => {
                let in_flight = self.v1().fee_in_flight;
                require!(amount <= in_flight, "fee in flight");
                let balance = self.v1().fee_balance;
                self.v1().fee_in_flight = sub(in_flight, amount);
                self.v1().fee_balance = add(balance, amount);
            }
            Outflow::Refund { vault_id } => {
                let mut vault = self.take_vault(vault_id);
                require!(amount == vault.refund_in_flight, "refund");
                vault.refund_in_flight = 0;
                vault.pot = add(vault.pot, amount);
                self.put_vault(vault_id, vault);
            }
            Outflow::Recover => {}
        }
    }

    fn take_pending(&mut self, vault_id: &str, round: u64, raid_id: &str, amount: u128) -> Crack {
        let key = CrackKey {
            vault_id: vault_id.to_string(),
            round,
            raid_id: raid_id.to_string(),
        };
        let crack = self.v1().cracks.get(&key).cloned().unwrap_or_else(|| env::panic_str("no crack"));
        require!(crack.status == CrackStatus::Pending, "not pending");
        require!(crack.amount == amount, "amount");
        crack
    }

    pub(crate) fn release_reserved(&mut self, vault: &mut Vault, amount: u128) {
        vault.reserved = sub(vault.reserved, amount);
        if vault.open {
            vault.day_pot = add(vault.day_pot, amount);
        } else {
            vault.pot = add(vault.pot, amount);
        }
    }
}
