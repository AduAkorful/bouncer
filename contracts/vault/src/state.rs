//! Versioned vault state. A published version only gains fields.
//! Do not reorder or remove fields inside `StateV1`, `Vault`, or `Crack`.

use near_sdk::borsh::BorshSerialize;
use near_sdk::store::{LookupMap, Vector};
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
pub const COMMIT_DOMAIN: &[u8] = b"bouncer.commit.v1";
pub const GUARD_V2_DOMAIN: &[u8] = b"bouncer.guard.v2";
/// `bouncer.guard.v1`, then 16 zero bytes. The guard's `GENERATOR`. A test pins it to the guard's value.
pub const GUARD_GENERATOR: [u8; 32] = [
    b'b', b'o', b'u', b'n', b'c', b'e', b'r', b'.', b'g', b'u', b'a', b'r', b'd', b'.', b'v', b'1',
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
];
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
    Specs,
    VaultIds,
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
    /// Names the account that may open and close rounds for the sponsor. It can do nothing else.
    pub keeper: Option<AccountId>,
    /// Hash of the sponsor's sealed story. The ciphertext is in `specs`, not here, to keep this view small.
    pub spec_hash: Option<[u8; 32]>,
    /// Plain text a player sees before a raid.
    pub card: Option<String>,
    /// Set at the first round. A story is fixed from then on.
    pub spec_locked: bool,
    /// Owner switch. Blocks a new round and nothing else.
    pub suspended: bool,
}

/// What a sponsor may do on a vault they create. Set by the owner. A fresh deploy is closed.
#[near(serializers = [borsh, json])]
#[derive(Clone, Debug)]
pub struct Limits {
    pub self_serve: bool,
    pub max_cap: u128,
    pub max_cracks: u32,
    pub min_lock_ns: u64,
    pub max_lock_ns: u64,
    pub max_open_lead_ns: u64,
    pub max_spec_ct: u32,
    pub max_card: u32,
    pub default_guard_pk: Option<[u8; 32]>,
    pub reserved_prefixes: Vec<String>,
}

impl Limits {
    pub fn closed() -> Self {
        Self {
            self_serve: false,
            max_cap: 0,
            max_cracks: 0,
            min_lock_ns: MIN_LOCK_NS,
            max_lock_ns: MIN_LOCK_NS,
            max_open_lead_ns: 0,
            max_spec_ct: 0,
            max_card: 0,
            default_guard_pk: None,
            reserved_prefixes: Vec::new(),
        }
    }
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
pub struct CommitMessage {
    pub vault_id: String,
    pub round: u64,
    pub commitment: [u8; 32],
    pub guard_version: [u8; 32],
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
    pub limits: Limits,
    /// The sealed story of a sponsor vault. Public ciphertext. Only the guard can open it.
    pub specs: LookupMap<String, Vec<u8>>,
    /// Every vault id, in creation order. A `LookupMap` cannot be walked, and the keeper needs to.
    pub vault_ids: Vector<String>,
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
            limits: Limits::closed(),
            specs: LookupMap::new(StorageKey::Specs),
            vault_ids: Vector::new(StorageKey::VaultIds),
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

/// The `guard_version` a round must carry when the vault has a sealed story. The guard writes the same
/// value into every verdict, so a verdict made under another story is refused.
pub fn spec_guard_version(spec_hash: &[u8; 32]) -> [u8; 32] {
    let mut input = GUARD_V2_DOMAIN.to_vec();
    input.extend(GUARD_GENERATOR);
    input.extend(spec_hash);
    env::sha256_array(&input)
}
