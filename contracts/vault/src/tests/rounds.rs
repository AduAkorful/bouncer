use super::support::*;
use crate::state::*;

#[test]
fn closes_at_is_the_next_utc_midnight() {
    assert_eq!(next_utc_midnight(0), DAY_NS);
    assert_eq!(next_utc_midnight(1), DAY_NS);
    assert_eq!(next_utc_midnight(DAY_NS), DAY_NS * 2);
    let door = pay_door();
    assert_eq!(door.vault().closes_at, DAY_NS);
    assert_eq!(door.vault().opens_at, 0);
}

#[test]
fn pay_the_bill_rollover_keeps_reserved() {
    let mut door = pay_door();
    door.submit("r1", "p1", 25, 1, 1);
    door.world.at(OWNER, 1);
    door.world.contract.close_round(door.vault_id.clone());
    let vault = door.vault();
    assert!(!vault.open);
    assert_eq!(vault.reserved, 25);
    assert_eq!(vault.day_pot, 0);
    assert_eq!(vault.pot, 10_000_000 - 25);
    assert!(vault.commitment.is_none());
    books(&door.world.contract, &["velvet"]);
}

#[test]
fn uncracked_day_rolls_into_the_pot() {
    let mut door = pay_door();
    door.world.at(PLAYER, DAY_NS);
    door.world.contract.close_round(door.vault_id.clone());
    let vault = door.vault();
    assert_eq!(vault.pot, 10_000_000);
    assert_eq!(vault.day_pot, 0);
    books(&door.world.contract, &["velvet"]);
}

#[test]
#[should_panic(expected = "too early")]
fn stranger_cannot_close_early() {
    let mut door = pay_door();
    door.world.at(PLAYER, 1);
    door.world.contract.close_round(door.vault_id.clone());
}

#[test]
fn split_three_crackers_leave_a_remainder() {
    let mut world = World::new(0);
    let guard = Key::from_seed(1);
    let claim = Key::from_seed(2);
    world.contract.create_vault(
        "velvet".into(),
        id(SPONSOR),
        PayoutRule::SplitTheDay,
        1_000,
        MIN_LOCK_NS,
        4,
        Some(0),
        false,
    );
    world.contract.set_guard_key("velvet".into(), guard.pk().to_vec());
    assert_eq!(deposit(&mut world, "velvet", &id(SPONSOR), 100, 0), 0);
    world.at(OWNER, 0);
    commit(&mut world, &guard, "velvet", hash(9), hash(8), 0);
    let mut door = Door { world, guard, claim, vault_id: "velvet".into() };
    assert_eq!(door.vault().day_pot, 100);
    for (raid, player, bill) in [("r1", "p1", 1u8), ("r2", "p2", 2), ("r3", "p3", 3)] {
        door.submit(raid, player, 0, bill, 1);
    }
    door.world.at(OWNER, 2);
    door.world.contract.close_round(door.vault_id.clone());
    let share = 100 / 3;
    for raid in ["r1", "r2", "r3"] {
        let crack = door.crack(1, raid);
        assert_eq!(crack.status, CrackStatus::Settled);
        assert_eq!(crack.amount, share);
        assert_eq!(crack.unlock_at, 2 + MIN_LOCK_NS);
    }
    let vault = door.vault();
    assert_eq!(vault.reserved, share * 3);
    assert_eq!(vault.pot, 1);
    assert_eq!(vault.day_pot, 0);
    books(&door.world.contract, &["velvet"]);
}

#[test]
fn split_with_zero_crackers_rolls_the_day() {
    let mut door = split_door();
    door.world.at(OWNER, 1);
    door.world.contract.close_round(door.vault_id.clone());
    assert_eq!(door.vault().pot, 10_000_000);
    assert_eq!(door.vault().reserved, 0);
    books(&door.world.contract, &["velvet"]);
}

#[test]
fn cap_change_applies_on_the_next_round_only() {
    let mut door = pay_door();
    door.submit("r1", "p1", 100, 1, 1);
    door.world.at(OWNER, 1);
    door.world.contract.close_round(door.vault_id.clone());
    door.world.contract.set_cap(door.vault_id.clone(), 50);
    commit(&mut door.world, &door.guard, &door.vault_id.clone(), hash(7), hash(8), DAY_NS);
    assert_eq!(door.crack(1, "r1").amount, 100);
    assert_eq!(door.vault().cap, 50);
    assert_eq!(door.vault().round, 2);
    assert_eq!(door.vault().day_pot, 200);
}

#[test]
#[should_panic(expected = "door open")]
fn set_cap_while_open_reverts() {
    let mut door = pay_door();
    door.world.contract.set_cap(door.vault_id.clone(), 10);
}

#[test]
#[should_panic(expected = "door open")]
fn set_lock_while_open_reverts() {
    let mut door = pay_door();
    door.world.contract.set_lock(door.vault_id.clone(), MIN_LOCK_NS);
}

#[test]
#[should_panic(expected = "door open")]
fn guard_key_change_while_open_reverts() {
    let mut door = pay_door();
    door.world.at(OWNER, 1);
    door.world.contract.set_guard_key(door.vault_id.clone(), Key::from_seed(3).pk().to_vec());
}

#[test]
fn guard_key_change_names_the_next_round() {
    let mut door = pay_door();
    door.world.at(OWNER, 1);
    door.world.contract.close_round(door.vault_id.clone());
    let key = Key::from_seed(4);
    door.world.contract.set_guard_key(door.vault_id, key.pk().to_vec());
    let logs = near_sdk::test_utils::get_logs();
    let last = logs.last().unwrap();
    assert!(last.contains("\"round\":2"));
    assert!(last.contains(&hex(&key.pk())));
}

fn hex(bytes: &[u8; 32]) -> String {
    bytes.iter().map(|b| format!("{b:02x}")).collect()
}
