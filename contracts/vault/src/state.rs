//! Versioned vault state. A published version only gains fields.
//! Do not reorder or remove fields inside `StateV1`, `Vault`, or `Crack`.

use near_sdk::borsh::BorshSerialize;
use near_sdk::store::LookupMap;
use near_sdk::{env, near, require, AccountId, BorshStorageKey};

/// Circle USDC on NEAR testnet. 6 decimals. Pinned 30 Oct 2026.
pub const USDC_ACCOUNT: &str = "3e2210e1184b45b64c8a434c0a7e7b23cc04ea7eb7a6c3c32520d03d4afcb8af";
/// Onchain `storage_balance_bounds` min = max, in yoctoNEAR.
pub const STORAGE_DEPOSIT: u128 = 1_250_000_000_000_000_000_000;
/// NEAR kept above the storage stake so a claim can attach one USDC registration.
pub const NEAR_FLOAT: u128 = 50_000_000_000_000_000_000_000;
pub const FEE_BPS_DENOM: u128 = 10_000;
pub const VERDICT_DOMAIN: &[u8] = b"bouncer.verdict.v1";
pub const CLAIM_DOMAIN: &[u8] = b"bouncer.claim.v1";
pub const SECOND_NS: u64 = 1_000_000_000;
pub const DAY_NS: u64 = 24 * 60 * 60 * SECOND_NS;
pub const GUEST_HOLD_NS: u64 = 7 * DAY_NS;
pub const MIN_LOCK_NS: u64 = 60 * SECOND_NS;

#[derive(BorshSerialize, BorshStorageKey)]
#[borsh(crate = "near_sdk::borsh")]
enum StorageKey {
    Vaults,
    Cracks,
    Players,
    Bills,
    Tickets,
    Admissions,
    RaidIndex,
    Crews,
    SpentClaims,
    SpentMembers,
}

#[near(serializers = [borsh, json])]
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum PayoutRule {
    PayTheBill,
    SplitTheDay,
}

#[near(serializers = [borsh, json])]
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum CrackStatus {
    Recorded,
    Settled,
    Reserved,
    Paid,
    Expired,
    Failed,
    Pending,
}

#[near(serializers = [borsh, json])]
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum TicketStatus {
    Issued,
    Used,
}

#[near(serializers = [borsh, json])]
#[derive(Clone, PartialEq, Eq, Debug)]
pub enum Outflow {
    Claim {
        vault_id: String,
        round: u64,
        raid_id: String,
    },
    Fee,
    Refund {
        vault_id: String,
    },
    Recover,
}

#[near(serializers = [borsh])]
#[derive(Clone, PartialEq, Eq, PartialOrd, Ord)]
pub struct CrackKey {
    pub vault_id: String,
    pub round: u64,
    pub raid_id: String,
}

#[near(serializers = [borsh])]
#[derive(Clone, PartialEq, Eq, PartialOrd, Ord)]
pub struct PlayerKey {
    pub vault_id: String,
    pub round: u64,
    pub player_id: String,
}

#[near(serializers = [borsh])]
#[derive(Clone, PartialEq, Eq, PartialOrd, Ord)]
pub struct BillKey {
    pub vault_id: String,
    pub round: u64,
    pub player_id: String,
    pub bill_hash: [u8; 32],
}

#[near(serializers = [borsh])]
#[derive(Clone, PartialEq, Eq, PartialOrd, Ord)]
pub struct TicketKey {
    pub vault_id: String,
    pub code_hash: [u8; 32],
}

#[near(serializers = [borsh])]
#[derive(Clone, PartialEq, Eq, PartialOrd, Ord)]
pub struct AdmissionKey {
    pub vault_id: String,
    pub round: u64,
    pub account: String,
}

#[near(serializers = [borsh])]
#[derive(Clone, PartialEq, Eq, PartialOrd, Ord)]
pub struct RaidIndexKey {
    pub vault_id: String,
    pub round: u64,
    pub index: u32,
}

#[near(serializers = [borsh, json])]
#[derive(Clone, Debug)]
pub struct Vault {
    pub sponsor: AccountId,
    pub pot: u128,
    pub day_pot: u128,
    pub reserved: u128,
    pub cap: u128,
    pub lock_ns: u64,
    pub rule: PayoutRule,
    pub guard_pk: Option<[u8; 32]>,
    pub commitment: Option<[u8; 32]>,
    pub guard_version: Option<[u8; 32]>,
    pub round: u64,
    pub opens_at: u64,
    pub closes_at: u64,
    pub open: bool,
    pub challenge_end: Option<u64>,
    pub max_cracks: u32,
    pub ticketed: bool,
    pub closed_pending_bump: bool,
    pub refund_in_flight: u128,
    pub crack_count: u32,
}

#[near(serializers = [borsh, json])]
#[derive(Clone, Debug)]
pub struct Crack {
    pub player_id: String,
    pub claim_pk: [u8; 32],
    pub bill_hash: [u8; 32],
    pub conversation_hash: [u8; 32],
    pub guard_version: [u8; 32],
    pub amount: u128,
    pub recorded_at: u64,
    pub unlock_at: u64,
    pub expires_at: u64,
    pub status: CrackStatus,
}

#[near(serializers = [borsh, json])]
#[derive(Clone)]
pub struct VerdictMessage {
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

#[near(serializers = [borsh])]
pub struct ClaimMessage {
    pub vault_id: String,
    pub round: u64,
    pub raid_id: String,
    pub payout: String,
}

#[near(serializers = [borsh])]
pub struct StateV1 {
    pub owner: AccountId,
    pub fee_bps: u16,
    pub fee_balance: u128,
    pub fee_in_flight: u128,
    /// USDC the books still claim. Pot, day pot, reserved, refunds, and fees.
    pub accounted: u128,
    pub factory_code_hash: Option<[u8; 32]>,
    pub vaults: LookupMap<String, Vault>,
    pub cracks: LookupMap<CrackKey, Crack>,
    pub players: LookupMap<PlayerKey, bool>,
    pub bills: LookupMap<BillKey, bool>,
    pub tickets: LookupMap<TicketKey, TicketStatus>,
    pub admissions: LookupMap<AdmissionKey, u32>,
    pub raid_index: LookupMap<RaidIndexKey, String>,
    pub crews: LookupMap<CrewKey, CrewRecord>,
    pub spent_claims: LookupMap<SpentClaimKey, bool>,
    pub spent_members: LookupMap<SpentMemberKey, bool>,
}

#[near(serializers = [borsh])]
pub enum State {
    V1(StateV1),
}

impl StateV1 {
    pub fn new(owner: AccountId, fee_bps: u16) -> Self {
        Self {
            owner,
            fee_bps,
            fee_balance: 0,
            fee_in_flight: 0,
            accounted: 0,
            factory_code_hash: None,
            vaults: LookupMap::new(StorageKey::Vaults),
            cracks: LookupMap::new(StorageKey::Cracks),
            players: LookupMap::new(StorageKey::Players),
            bills: LookupMap::new(StorageKey::Bills),
            tickets: LookupMap::new(StorageKey::Tickets),
            admissions: LookupMap::new(StorageKey::Admissions),
            raid_index: LookupMap::new(StorageKey::RaidIndex),
            crews: LookupMap::new(StorageKey::Crews),
            spent_claims: LookupMap::new(StorageKey::SpentClaims),
            spent_members: LookupMap::new(StorageKey::SpentMembers),
        }
    }
}

#[near(serializers = [borsh])]
#[derive(Clone, PartialEq, Eq, PartialOrd, Ord)]
pub struct CrewKey {
    pub vault_id: String,
    pub round: u64,
    pub crew: AccountId,
}

#[near(serializers = [borsh])]
#[derive(Clone)]
pub struct CrewSeat {
    pub member: AccountId,
    pub claim_pk: [u8; 32],
}

#[near(serializers = [borsh])]
#[derive(Clone)]
pub struct CrewRecord {
    pub seats: Vec<CrewSeat>,
}

#[near(serializers = [borsh])]
#[derive(Clone, PartialEq, Eq, PartialOrd, Ord)]
pub struct SpentClaimKey {
    pub vault_id: String,
    pub round: u64,
    pub claim_pk: [u8; 32],
}

#[near(serializers = [borsh])]
#[derive(Clone, PartialEq, Eq, PartialOrd, Ord)]
pub struct SpentMemberKey {
    pub vault_id: String,
    pub round: u64,
    pub member: String,
}

pub fn usdc_account() -> AccountId {
    USDC_ACCOUNT.parse().unwrap_or_else(|_| env::panic_str("usdc account"))
}

pub fn add(a: u128, b: u128) -> u128 {
    a.checked_add(b).unwrap_or_else(|| env::panic_str("overflow"))
}

pub fn sub(a: u128, b: u128) -> u128 {
    a.checked_sub(b).unwrap_or_else(|| env::panic_str("overflow"))
}

pub fn require_id(id: &str) {
    let ok = !id.is_empty()
        && id.len() <= 64
        && id.bytes().all(|b| b.is_ascii_alphanumeric() || matches!(b, b'.' | b'_' | b'-'));
    require!(ok, "bad id");
}

pub fn require_lock(lock_ns: u64) {
    require!(lock_ns >= MIN_LOCK_NS, "lock too short");
    require!(lock_ns < GUEST_HOLD_NS, "lock too long");
}

pub fn require_fee_bps(fee_bps: u16) {
    require!(fee_bps <= 10_000, "fee bps");
}

/// Next 00:00 UTC strictly after `opens_at`.
pub fn next_utc_midnight(opens_at: u64) -> u64 {
    require!(opens_at <= u64::MAX - DAY_NS, "opens at");
    opens_at / DAY_NS * DAY_NS + DAY_NS
}

pub fn split_fee(amount: u128, fee_bps: u16) -> (u128, u128) {
    require_fee_bps(fee_bps);
    let fee = amount
        .checked_mul(u128::from(fee_bps))
        .unwrap_or_else(|| env::panic_str("overflow"))
        / FEE_BPS_DENOM;
    (fee, sub(amount, fee))
}

/// Domain bytes, then borsh of `body`. The domain is not itself borsh-length-prefixed.
pub fn domain_bytes<T: BorshSerialize>(domain: &[u8], body: &T) -> Vec<u8> {
    let mut out = domain.to_vec();
    let encoded = near_sdk::borsh::to_vec(body).unwrap_or_else(|_| env::panic_str("borsh"));
    out.extend(encoded);
    out
}
