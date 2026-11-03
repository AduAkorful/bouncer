use super::support::*;
use crate::state::*;
use near_sdk::json_types::U128;
use near_sdk::PromiseError;

#[test]
#[should_panic(expected = "lock too long")]
fn lock_of_seven_days_reverts() {
    let mut world = World::new(0);
    world.contract.create_vault(
        "velvet".into(),
        id(SPONSOR),
        PayoutRule::PayTheBill,
        1,
        GUEST_HOLD_NS,
        1,
        None,
        false,
    );
}

#[test]
#[should_panic(expected = "lock too short")]
fn lock_under_sixty_seconds_reverts() {
    let mut world = World::new(0);
    world.contract.create_vault(
        "velvet".into(),
        id(SPONSOR),
        PayoutRule::PayTheBill,
        1,
        MIN_LOCK_NS - 1,
        1,
        None,
        false,
    );
}

#[test]
#[should_panic(expected = "lock too long")]
fn set_lock_of_seven_days_reverts() {
    let mut door = pay_door();
    door.world.at(OWNER, 1);
    door.world.contract.close_round(door.vault_id.clone());
    door.world.contract.set_lock(door.vault_id, GUEST_HOLD_NS);
}

#[test]
#[should_panic(expected = "reserved remains")]
fn sponsor_refund_cannot_touch_reserved() {
    let mut door = pay_door();
    door.submit("r1", "p1", 20, 1, 1);
    door.world.at(OWNER, 1);
    door.world.contract.close_round(door.vault_id.clone());
    door.world.at(SPONSOR, 1);
    door.world.contract.end_challenge(door.vault_id);
}

#[test]
#[should_panic(expected = "door open")]
fn sponsor_cannot_withdraw_an_open_round() {
    let mut door = pay_door();
    door.world.at(SPONSOR, 1);
    door.world.contract.end_challenge(door.vault_id);
}

#[test]
fn refund_returns_the_pot_and_not_the_fee() {
    let mut door = door(PayoutRule::PayTheBill, false, 1_000);
    assert_eq!(door.world.contract.get_fee_balance(), 1_000_000);
    assert_eq!(door.vault().pot, 5_000_000);
    door.world.at(OWNER, 1);
    door.world.contract.close_round(door.vault_id.clone());
    let pot = door.vault().pot;
    assert_eq!(pot, 9_000_000);
    door.world.at(SPONSOR, 1);
    door.world.contract.end_challenge(door.vault_id.clone());
    assert_eq!(door.vault().pot, 0);
    assert_eq!(door.vault().refund_in_flight, pot);
    assert_eq!(door.world.contract.get_fee_balance(), 1_000_000);
    books(&door.world.contract, &["velvet"]);
    door.world.at(CONTRACT, 1);
    door.world.contract.on_transfer_done(Outflow::Refund { vault_id: door.vault_id.clone() }, U128(pot), Ok(()));
    assert_eq!(door.vault().refund_in_flight, 0);
    assert_eq!(door.world.contract.get_fee_balance(), 1_000_000);
    assert_eq!(door.world.contract.get_accounted(), 1_000_000);
    books(&door.world.contract, &["velvet"]);
}

#[test]
fn fee_withdraw_failure_restores_the_fee() {
    let mut door = door(PayoutRule::PayTheBill, false, 1_000);
    door.world.at(OWNER, 1);
    door.world.contract.withdraw_fees(id(OWNER), 400);
    assert_eq!(door.world.contract.get_fee_balance(), 999_600);
    door.world.at(CONTRACT, 1);
    door.world.contract.on_transfer_done(Outflow::Fee, U128(400), Err(PromiseError::Failed));
    assert_eq!(door.world.contract.get_fee_balance(), 1_000_000);
    books(&door.world.contract, &["velvet"]);
    door.world.at(OWNER, 1);
    door.world.contract.withdraw_fees(id(OWNER), 400);
    door.world.at(CONTRACT, 1);
    door.world.contract.on_transfer_done(Outflow::Fee, U128(400), Ok(()));
    assert_eq!(door.world.contract.get_fee_balance(), 999_600);
    books(&door.world.contract, &["velvet"]);
}

#[test]
fn recover_cannot_spend_the_books() {
    let mut door = pay_door();
    let pot = door.vault().pot;
    let accounted = door.world.contract.get_accounted();
    door.world.at(CONTRACT, 1);
    door.world.contract.on_recover_balance(id(OWNER), U128(50), Ok(U128(accounted + 50)));
    assert_eq!(door.vault().pot, pot);
    assert_eq!(door.world.contract.get_accounted(), accounted);
    books(&door.world.contract, &["velvet"]);
}

#[test]
#[should_panic(expected = "surplus")]
fn recover_above_surplus_reverts() {
    let mut door = pay_door();
    door.world.at(CONTRACT, 1);
    let accounted = door.world.contract.get_accounted();
    door.world.contract.on_recover_balance(id(OWNER), U128(2), Ok(U128(accounted + 1)));
}
