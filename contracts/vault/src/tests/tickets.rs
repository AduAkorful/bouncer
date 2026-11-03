use super::support::*;
use crate::MIN_LOCK_NS;
use near_sdk::env;

#[test]
fn ticket_admits_one_raid_and_a_second_redeem_reverts() {
    let mut door = door(crate::PayoutRule::PayTheBill, true, 0);
    let code = "night-pass";
    let hash = {
        door.world.at(OWNER, 0);
        env::sha256_array(code.as_bytes()).to_vec()
    };
    door.world.contract.issue_ticket(door.vault_id.clone(), hash);
    door.world.at(PLAYER, 1);
    door.world.contract.redeem_ticket(door.vault_id.clone(), code.into());
    door.submit("r1", PLAYER, 15, 1, 1);
    assert_eq!(door.crack(1, "r1").amount, 15);
}

#[test]
#[should_panic(expected = "ticket used")]
fn reused_ticket() {
    let mut door = door(crate::PayoutRule::PayTheBill, true, 0);
    let code = "night-pass";
    door.world.at(OWNER, 0);
    let hash = env::sha256_array(code.as_bytes()).to_vec();
    door.world.contract.issue_ticket(door.vault_id.clone(), hash);
    door.world.at(PLAYER, 1);
    door.world.contract.redeem_ticket(door.vault_id.clone(), code.into());
    door.world.contract.redeem_ticket(door.vault_id, code.into());
}

#[test]
#[should_panic(expected = "no ticket")]
fn ticket_on_the_wrong_vault() {
    let mut door = door(crate::PayoutRule::PayTheBill, true, 0);
    door.world.at(OWNER, 0);
    door.world.contract.create_vault(
        "other".into(),
        id(SPONSOR),
        crate::PayoutRule::PayTheBill,
        1_000_000,
        MIN_LOCK_NS,
        1,
        None,
        true,
    );
    let hash = env::sha256_array(b"night-pass").to_vec();
    door.world.contract.issue_ticket("other".into(), hash);
    door.world.at(PLAYER, 1);
    door.world.contract.redeem_ticket(door.vault_id, "night-pass".into());
}

#[test]
#[should_panic(expected = "no ticket")]
fn ticketed_verdict_without_a_redeem_reverts() {
    let mut door = door(crate::PayoutRule::PayTheBill, true, 0);
    door.submit("r1", PLAYER, 10, 1, 1);
}
