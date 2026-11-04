use borsh::BorshSerialize;
use sha2::{Digest, Sha256};

use crate::ledger::Line;
use crate::session::Turn;

/// `bouncer.guard.v1`, then 16 zero bytes. The vault stores this as `guard_version`.
pub const GENERATOR: [u8; 32] = [
    b'b', b'o', b'u', b'n', b'c', b'e', b'r', b'.', b'g', b'u', b'a', b'r', b'd', b'.', b'v', b'1',
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
];

pub const VERDICT_DOMAIN: &[u8] = b"bouncer.verdict.v1";
pub const REVEAL_DOMAIN: &[u8] = b"bouncer.reveal.v1";
pub const COMMIT_DOMAIN: &[u8] = b"bouncer.commit.v1";

#[derive(BorshSerialize)]
pub struct VerdictBody {
    pub vault_id: String,
    pub round: u64,
    pub raid_id: String,
    pub player_id: String,
    pub bill_hash: [u8; 32],
    pub amount: u128,
    pub claim_pk: [u8; 32],
    pub conversation_hash: [u8; 32],
    pub guard_version: [u8; 32],
}

#[derive(BorshSerialize)]
struct RevealBody {
    vault_id: String,
    round: u64,
    player_id: String,
    ledger_hash: [u8; 32],
    commitment: [u8; 32],
}

#[derive(BorshSerialize)]
struct BillBody<'a> {
    payee: &'a str,
    reference: &'a str,
    item: &'a str,
    qty: u128,
    unit: u128,
}

pub fn commitment(seed: &[u8; 32]) -> [u8; 32] {
    let mut hasher = Sha256::new();
    hasher.update(GENERATOR);
    hasher.update(seed);
    hasher.finalize().into()
}

pub fn domain_bytes(domain: &[u8], body: &[u8]) -> Vec<u8> {
    let mut out = domain.to_vec();
    out.extend_from_slice(body);
    out
}

pub fn verdict_bytes(body: &VerdictBody) -> Result<Vec<u8>, &'static str> {
    let encoded = borsh::to_vec(body).map_err(|_| "borsh")?;
    Ok(domain_bytes(VERDICT_DOMAIN, &encoded))
}

pub fn reveal_bytes(
    vault_id: &str,
    round: u64,
    player_id: &str,
    ledger_hash: [u8; 32],
    commitment: [u8; 32],
) -> Result<Vec<u8>, &'static str> {
    let body = RevealBody {
        vault_id: vault_id.to_string(),
        round,
        player_id: player_id.to_string(),
        ledger_hash,
        commitment,
    };
    let encoded = borsh::to_vec(&body).map_err(|_| "borsh")?;
    Ok(domain_bytes(REVEAL_DOMAIN, &encoded))
}

#[derive(BorshSerialize)]
struct CommitBody {
    vault_id: String,
    round: u64,
    commitment: [u8; 32],
    guard_version: [u8; 32],
}

/// What the vault checks before it accepts a round: the guard signed this commitment and version.
pub fn commit_bytes(vault_id: &str, round: u64, commitment: [u8; 32], guard_version: [u8; 32]) -> Result<Vec<u8>, &'static str> {
    let body = CommitBody { vault_id: vault_id.to_string(), round, commitment, guard_version };
    let encoded = borsh::to_vec(&body).map_err(|_| "borsh")?;
    Ok(domain_bytes(COMMIT_DOMAIN, &encoded))
}

pub fn bill_hash(payee: &str, reference: &str, item: &str, qty: u128, unit: u128) -> Result<[u8; 32], &'static str> {
    let body = BillBody { payee, reference, item, qty, unit };
    let encoded = borsh::to_vec(&body).map_err(|_| "borsh")?;
    Ok(sha256(&encoded))
}

pub fn conversation_hash(turns: &[Turn]) -> Result<[u8; 32], &'static str> {
    let encoded = borsh::to_vec(turns).map_err(|_| "borsh")?;
    Ok(sha256(&encoded))
}

pub fn ledger_hash(lines: &[Line]) -> Result<[u8; 32], &'static str> {
    let encoded = borsh::to_vec(lines).map_err(|_| "borsh")?;
    Ok(sha256(&encoded))
}

pub fn sha256(bytes: &[u8]) -> [u8; 32] {
    Sha256::digest(bytes).into()
}
