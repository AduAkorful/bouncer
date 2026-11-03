use crate::state::*;
use crate::{VaultContract, VaultContractExt};
use near_sdk::{env, near, require};

#[near]
impl VaultContract {
    /// Stores `sha256(code)`. The code itself is not an argument, so it stays off the books.
    pub fn issue_ticket(&mut self, vault_id: String, code_hash: Vec<u8>) {
        require!(code_hash.len() == 32, "bad hash");
        let mut hash = [0u8; 32];
        hash.copy_from_slice(&code_hash);
        let vault = self.take_vault(&vault_id);
        require!(vault.ticketed, "not ticketed");
        let pred = env::predecessor_account_id();
        require!(pred == self.v1_ref().owner || pred == vault.sponsor, "not sponsor");
        let key = TicketKey { vault_id, code_hash: hash };
        require!(self.v1().tickets.get(&key).is_none(), "ticket exists");
        self.v1().tickets.insert(key, TicketStatus::Issued);
    }

    pub fn redeem_ticket(&mut self, vault_id: String, code: String) {
        require!(!code.is_empty() && code.len() <= 128, "bad code");
        let vault = self.take_vault(&vault_id);
        require!(vault.ticketed, "not ticketed");
        let now = env::block_timestamp();
        require!(vault.open, "not open");
        require!(now >= vault.opens_at, "too early");
        require!(now < vault.closes_at, "too late");
        let round = vault.round;
        let hash = env::sha256_array(code.as_bytes());
        let key = TicketKey { vault_id: vault_id.clone(), code_hash: hash };
        let status = self.v1().tickets.get(&key).cloned().unwrap_or_else(|| env::panic_str("no ticket"));
        require!(status == TicketStatus::Issued, "ticket used");
        self.v1().tickets.insert(key, TicketStatus::Used);
        let admit = AdmissionKey {
            vault_id,
            round,
            account: env::predecessor_account_id().to_string(),
        };
        let left = self.v1().admissions.get(&admit).copied().unwrap_or(0);
        let next = left.checked_add(1).unwrap_or_else(|| env::panic_str("overflow"));
        self.v1().admissions.insert(admit, next);
    }
}
