use super::support::*;
use crate::crew::{even_split, policy_shares};
use crate::state::*;
use crate::verdict::claim_bytes;
use near_sdk::serde_json::json;
use near_sdk::PromiseError;

const DAO: &str = "lions.sputnikv2.testnet";

fn policy(accounts: &[&str]) -> near_sdk::serde_json::Value {
    json!({
        "roles": [
            { "name": "all", "kind": "Everyone" },
            { "name": "council", "kind": { "Group": accounts } }
        ]
    })
}

fn joined(door: &mut Door, member: &str, claim: [u8; 32], accounts: &[&str]) {
    let round = door.vault().round;
    door.world.at(CONTRACT, 1);
    door.world.contract.on_crew_joined(
        door.vault_id.clone(),
        round,
        id(DAO),
        id(member),
        claim.to_vec(),
        Ok(policy(accounts)),
    );
}

#[test]
fn a_failed_policy_read_records_nothing() {
    let mut door = pay_door();
    let round = door.vault().round;
    door.world.at(CONTRACT, 1);
    door.world.contract.on_crew_joined(
        door.vault_id.clone(),
        round,
        id(DAO),
        id(PLAYER),
        hash(3).to_vec(),
        Err(PromiseError::Failed),
    );
    assert!(door.world.contract.get_crew(door.vault_id.clone(), round, id(DAO)).is_empty());
}

#[test]
fn an_account_outside_the_council_records_nothing() {
    let mut door = pay_door();
    joined(&mut door, PLAYER, hash(3), &["other.test.near"]);
    let round = door.vault().round;
    assert!(door.world.contract.get_crew(door.vault_id, round, id(DAO)).is_empty());
}

#[test]
#[should_panic(expected = "refused")]
fn a_council_with_the_sponsor_is_refused() {
    let mut door = pay_door();
    joined(&mut door, PLAYER, hash(3), &[PLAYER, SPONSOR]);
}

#[test]
#[should_panic(expected = "refused")]
fn a_council_with_the_owner_is_refused() {
    let mut door = pay_door();
    joined(&mut door, PLAYER, hash(3), &[PLAYER, OWNER]);
}

#[test]
#[should_panic(expected = "crew full")]
fn a_fifth_member_is_refused() {
    let mut door = pay_door();
    let members = ["one.test.near", "two.test.near", "three.test.near", "four.test.near"];
    for (index, member) in members.iter().enumerate() {
        joined(&mut door, member, hash(10 + index as u8), &members);
    }
    joined(&mut door, "five.test.near", hash(20), &["one.test.near", "two.test.near", "three.test.near", "four.test.near", "five.test.near"]);
}

#[test]
#[should_panic(expected = "crew")]
fn a_crew_verdict_with_one_member_is_refused() {
    let mut door = pay_door();
    joined(&mut door, PLAYER, hash(3), &[PLAYER]);
    let mut verdict = door.verdict("r1", DAO, 10, 1);
    verdict.claim_pk = hash(9);
    door.submit_as(PLAYER, verdict, 1);
}

#[test]
#[should_panic(expected = "claim key")]
fn a_claim_key_spent_by_a_join_cannot_submit_a_personal_verdict() {
    let mut door = pay_door();
    let spent = door.claim.pk();
    joined(&mut door, PLAYER, spent, &[PLAYER, "two.test.near"]);
    door.submit("r1", "solo.test.near", 10, 1, 1);
}

#[test]
fn two_members_can_submit_a_crew_verdict() {
    let mut door = pay_door();
    joined(&mut door, PLAYER, hash(3), &[PLAYER, "two.test.near"]);
    joined(&mut door, "two.test.near", hash(4), &[PLAYER, "two.test.near"]);
    let mut verdict = door.verdict("r1", DAO, 10, 1);
    verdict.claim_pk = hash(9);
    door.submit_as(PLAYER, verdict, 1);
    assert_eq!(door.crack(1, "r1").player_id, DAO);
}

#[test]
fn an_even_split_leaves_the_remainder_unallocated() {
    let shares = even_split(10, 3);
    assert_eq!(shares, vec![3, 3, 3]);
    assert_eq!(shares.iter().sum::<u128>(), 9);
}

#[test]
#[should_panic(expected = "shares")]
fn a_policy_that_does_not_sum_to_the_whole_is_refused() {
    let _ = policy_shares(1_000, &[4_000, 3_000, 2_000]);
}

#[test]
fn get_usdc_account_is_the_payout_account() {
    let door = pay_door();
    assert_eq!(door.world.contract.get_usdc_account(), id(USDC_ACCOUNT));
}

#[test]
fn claim_bytes_for_a_dao_payout_match_the_fixture() {
    assert_eq!(
        hex(&claim_bytes("velvet-1", 1, "raid-1", DAO)),
        "626f756e6365722e636c61696d2e76310800000076656c7665742d31010000000000000006000000726169642d31170000006c696f6e732e737075746e696b76322e746573746e6574"
    );
}

fn hex(bytes: &[u8]) -> String {
    bytes.iter().map(|byte| format!("{byte:02x}")).collect()
}
