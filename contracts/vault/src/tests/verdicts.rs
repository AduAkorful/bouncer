use super::support::*;
use crate::state::*;
use crate::verdict::verdict_bytes;

#[test]
#[should_panic(expected = "bad signature")]
fn bad_signature() {
    let mut door = pay_door();
    let verdict = door.verdict("r1", "p1", 10, 1);
    let mut bad = door.guard.sign(&verdict_bytes(&verdict));
    bad[0] ^= 0xff;
    door.world.at(PLAYER, 1);
    door.world.contract.submit_verdict(verdict, bad);
}

#[test]
#[should_panic(expected = "bad signature")]
fn wrong_key() {
    let mut door = pay_door();
    let verdict = door.verdict("r1", "p1", 10, 1);
    let other = Key::from_seed(9);
    door.world.at(PLAYER, 1);
    door.world.contract.submit_verdict(verdict, other.sign(&verdict_bytes(&door.verdict("r1", "p1", 10, 1))));
}

#[test]
#[should_panic(expected = "bad signature")]
fn wrong_domain() {
    let mut door = pay_door();
    let verdict = door.verdict("r1", "p1", 10, 1);
    let mut message = b"bouncer.verdict.v0".to_vec();
    message.extend(near_sdk::borsh::to_vec(&verdict).unwrap());
    let signature = door.guard.sign(&message);
    door.world.at(PLAYER, 1);
    door.world.contract.submit_verdict(verdict, signature);
}

#[test]
#[should_panic(expected = "truncated signature")]
fn truncated_signature() {
    let mut door = pay_door();
    let verdict = door.verdict("r1", "p1", 10, 1);
    door.world.at(PLAYER, 1);
    door.world.contract.submit_verdict(verdict, vec![1, 2, 3]);
}

#[test]
#[should_panic(expected = "too early")]
fn before_opens_at() {
    let mut door = pay_door();
    door.world.at(OWNER, 0);
    door.world.contract.close_round(door.vault_id.clone());
    door.world.at(OWNER, 0);
    commit(&mut door.world, &door.guard, &door.vault_id.clone(), hash(3), hash(8), DAY_NS);
    door.submit("r1", "p1", 10, 1, 1);
}

#[test]
#[should_panic(expected = "too late")]
fn after_closes_at() {
    let mut door = pay_door();
    let closes = door.vault().closes_at;
    door.submit("r1", "p1", 10, 1, closes);
}

#[test]
#[should_panic(expected = "no commitment")]
fn empty_commitment() {
    let mut door = pay_door();
    let mut vault = door.world.contract.take_vault(&door.vault_id);
    vault.commitment = None;
    door.world.contract.put_vault(&door.vault_id, vault);
    door.submit("r1", "p1", 10, 1, 1);
}

#[test]
#[should_panic(expected = "no guard")]
fn empty_guard_key() {
    let mut door = pay_door();
    let mut vault = door.world.contract.take_vault(&door.vault_id);
    vault.guard_pk = None;
    door.world.contract.put_vault(&door.vault_id, vault);
    door.submit("r1", "p1", 10, 1, 1);
}

#[test]
#[should_panic(expected = "above cap")]
fn amount_above_cap() {
    let mut door = pay_door();
    door.submit("r1", "p1", 1_000_001, 1, 1);
}

#[test]
#[should_panic(expected = "above day pot")]
fn amount_above_day_pot() {
    let mut door = pay_door();
    let mut vault = door.world.contract.take_vault(&door.vault_id);
    vault.day_pot = 10;
    door.world.contract.put_vault(&door.vault_id, vault);
    door.submit("r1", "p1", 11, 1, 1);
}

#[test]
#[should_panic(expected = "zero amount")]
fn zero_amount_on_pay_the_bill() {
    let mut door = pay_door();
    door.submit("r1", "p1", 0, 1, 1);
}

#[test]
#[should_panic(expected = "nonzero amount")]
fn nonzero_amount_on_split_the_day() {
    let mut door = split_door();
    door.submit("r1", "p1", 1, 1, 1);
}

#[test]
#[should_panic(expected = "raid exists")]
fn second_raid_id() {
    let mut door = pay_door();
    door.submit("r1", "p1", 10, 1, 1);
    door.submit("r1", "p2", 10, 2, 1);
}

#[test]
#[should_panic(expected = "player exists")]
fn second_player_in_the_round() {
    let mut door = pay_door();
    door.submit("r1", "p1", 10, 1, 1);
    door.submit("r2", "p1", 10, 2, 1);
}

#[test]
#[should_panic(expected = "bill exists")]
fn second_bill_hash_for_that_player() {
    let mut door = pay_door();
    door.submit("r1", "p1", 10, 1, 1);
    door.submit("r2", "p1", 10, 1, 1);
}

#[test]
#[should_panic(expected = "not owner")]
fn owner_cannot_submit() {
    let mut door = pay_door();
    let verdict = door.verdict("r1", "p1", 10, 1);
    door.submit_as(OWNER, verdict, 1);
}

#[test]
fn domain_bytes_fixture() {
    let guard_version = [
        b'b', b'o', b'u', b'n', b'c', b'e', b'r', b'.', b'g', b'u', b'a', b'r', b'd', b'.', b'v',
        b'1', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    ];
    let verdict = VerdictMessage {
        vault_id: "velvet-1".into(),
        round: 1,
        raid_id: "raid-1".into(),
        player_id: "player-1".into(),
        bill_hash: [0x11; 32],
        amount: 350_000_000,
        claim_pk: [0x22; 32],
        conversation_hash: [0x33; 32],
        guard_version,
    };
    assert_eq!(
        hex(&verdict_bytes(&verdict)),
        "626f756e6365722e766572646963742e76310800000076656c7665742d31010000000000000006000000726169642d3108000000706c617965722d3111111111111111111111111111111111111111111111111111111111111111118093dc1400000000000000000000000022222222222222222222222222222222222222222222222222222222222222223333333333333333333333333333333333333333333333333333333333333333626f756e6365722e67756172642e763100000000000000000000000000000000"
    );
}

fn hex(bytes: &[u8]) -> String {
    const H: &[u8; 16] = b"0123456789abcdef";
    let mut out = String::with_capacity(bytes.len() * 2);
    for byte in bytes {
        out.push(H[(byte >> 4) as usize] as char);
        out.push(H[(byte & 0xf) as usize] as char);
    }
    out
}

#[test]
fn pay_the_bill_reserves_and_does_not_transfer() {
    let mut door = pay_door();
    let before = calls().len();
    door.submit("r1", "p1", 25, 1, 1);
    let crack = door.crack(1, "r1");
    assert_eq!(crack.status, CrackStatus::Reserved);
    assert_eq!(crack.amount, 25);
    assert_eq!(crack.unlock_at, 1 + MIN_LOCK_NS);
    assert_eq!(crack.expires_at, 1 + GUEST_HOLD_NS);
    let vault = door.vault();
    assert_eq!(vault.reserved, 25);
    assert_eq!(vault.day_pot, 4_000_000 - 25);
    assert_eq!(calls().len(), before);
    books(&door.world.contract, &["velvet"]);
}
