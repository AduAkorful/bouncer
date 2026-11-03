use super::support::*;
use crate::state::*;
use crate::VaultContract;
use near_sdk::json_types::U128;
use near_sdk::mock::MockAction;
use near_sdk::test_utils::{get_created_receipts, VMContextBuilder};
use near_sdk::{testing_env, NearToken, PromiseOrValue};

fn returned(value: PromiseOrValue<U128>) -> u128 {
    match value {
        PromiseOrValue::Value(amount) => amount.0,
        PromiseOrValue::Promise(_) => panic!("promise"),
    }
}

#[test]
fn host_verifies_ed25519() {
    switch(OWNER, 0, NearToken::from_yoctonear(0), NearToken::from_near(1));
    let key = Key::from_seed(7);
    let message = b"Hello world!";
    let signature = key.sign(message);
    let mut sig = [0u8; 64];
    sig.copy_from_slice(&signature);
    assert!(near_sdk::env::ed25519_verify(&sig, message, &key.pk()));
    sig[0] ^= 1;
    assert!(!near_sdk::env::ed25519_verify(&sig, message, &key.pk()));
}

#[test]
fn wrong_token_credits_nothing() {
    let mut world = World::new(0);
    world.contract.create_vault(
        "velvet".into(),
        id(SPONSOR),
        PayoutRule::PayTheBill,
        1,
        MIN_LOCK_NS,
        1,
        None,
        false,
    );
    world.at(OWNER, 0);
    let back = returned(world.contract.ft_on_transfer(id(SPONSOR), U128(500), "velvet".into()));
    assert_eq!(back, 500);
    assert_eq!(world.contract.get_vault("velvet".into()).unwrap().pot, 0);
    assert_eq!(world.contract.get_accounted(), 0);
}

#[test]
fn unknown_vault_and_wrong_sponsor_are_returned() {
    let mut world = World::new(0);
    world.contract.create_vault(
        "velvet".into(),
        id(SPONSOR),
        PayoutRule::PayTheBill,
        1,
        MIN_LOCK_NS,
        1,
        None,
        false,
    );
    world.at(USDC_ACCOUNT, 0);
    assert_eq!(
        returned(world.contract.ft_on_transfer(id(SPONSOR), U128(500), "missing".into())),
        500
    );
    assert_eq!(
        returned(world.contract.ft_on_transfer(id(OWNER), U128(500), "velvet".into())),
        500
    );
    assert_eq!(world.contract.get_accounted(), 0);
    books(&world.contract, &["velvet"]);
}

#[test]
fn fee_zero_one_and_all_stay_out_of_the_pot() {
    for (bps, amount, fee) in [(0u16, 10_000u128, 0u128), (1, 10_000, 1), (10_000, 10_000, 10_000)] {
        let mut world = World::new(bps);
        world.contract.create_vault(
            "velvet".into(),
            id(SPONSOR),
            PayoutRule::PayTheBill,
            1,
            MIN_LOCK_NS,
            1,
            None,
            false,
        );
        assert_eq!(deposit(&mut world, "velvet", &id(SPONSOR), amount, 0), 0);
        let vault = world.contract.get_vault("velvet".into()).unwrap();
        assert_eq!(vault.pot, amount - fee);
        assert_eq!(world.contract.get_fee_balance(), fee);
        books(&world.contract, &["velvet"]);
    }
}

#[test]
fn set_fee_does_not_reprice_a_pot() {
    let mut world = World::new(1_000);
    world.contract.create_vault(
        "velvet".into(),
        id(SPONSOR),
        PayoutRule::PayTheBill,
        1,
        MIN_LOCK_NS,
        1,
        None,
        false,
    );
    deposit(&mut world, "velvet", &id(SPONSOR), 10_000, 0);
    assert_eq!(world.contract.get_vault("velvet".into()).unwrap().pot, 9_000);
    world.at(OWNER, 0);
    world.contract.set_fee_bps(0);
    assert_eq!(world.contract.get_vault("velvet".into()).unwrap().pot, 9_000);
    deposit(&mut world, "velvet", &id(SPONSOR), 10_000, 0);
    assert_eq!(world.contract.get_vault("velvet".into()).unwrap().pot, 19_000);
    assert_eq!(world.contract.get_fee_balance(), 1_000);
    books(&world.contract, &["velvet"]);
}

#[test]
fn two_vaults_do_not_share_a_pot() {
    let mut world = World::new(0);
    for name in ["a", "b"] {
        world.at(OWNER, 0);
        world.contract.create_vault(
            name.into(),
            id(SPONSOR),
            PayoutRule::PayTheBill,
            10,
            MIN_LOCK_NS,
            1,
            None,
            false,
        );
    }
    deposit(&mut world, "a", &id(SPONSOR), 80, 0);
    assert_eq!(world.contract.get_vault("a".into()).unwrap().pot, 80);
    assert_eq!(world.contract.get_vault("b".into()).unwrap().pot, 0);
    books(&world.contract, &["a", "b"]);
}

#[test]
#[should_panic(expected = "fee bps")]
fn fee_above_ten_thousand_reverts() {
    let _ = VaultContract::init(id(OWNER), 10_001);
}

#[test]
fn near_float_covers_one_usdc_registration() {
    assert!(NEAR_FLOAT >= STORAGE_DEPOSIT);
}

#[test]
fn near_withdraw_stops_at_the_float() {
    let mut builder = VMContextBuilder::new();
    builder
        .current_account_id(id(CONTRACT))
        .predecessor_account_id(id(OWNER))
        .block_timestamp(0)
        .storage_usage(1_000)
        .account_balance(NearToken::from_near(10))
        .prepaid_gas(near_sdk::Gas::from_tgas(100));
    testing_env!(builder.build());
    let mut contract = VaultContract::init(id(OWNER), 0);
    let min = contract.minimum_near();
    let balance = near_sdk::env::account_balance();
    let room = balance.checked_sub(min).unwrap();
    let _ = contract.withdraw_near(room.as_yoctonear());
    let sent = get_created_receipts().into_iter().flat_map(|receipt| receipt.actions).any(|action| {
        matches!(action, MockAction::Transfer { deposit, .. } if deposit == room)
    });
    assert!(sent);
}

#[test]
#[should_panic(expected = "near float")]
fn near_withdraw_one_yocto_past_the_float_reverts() {
    let mut builder = VMContextBuilder::new();
    builder
        .current_account_id(id(CONTRACT))
        .predecessor_account_id(id(OWNER))
        .storage_usage(1_000)
        .account_balance(NearToken::from_near(10))
        .prepaid_gas(near_sdk::Gas::from_tgas(100));
    testing_env!(builder.build());
    let mut contract = VaultContract::init(id(OWNER), 0);
    let min = contract.minimum_near();
    let balance = near_sdk::env::account_balance();
    let room = balance.as_yoctonear() - min.as_yoctonear() + 1;
    let _ = contract.withdraw_near(room);
}
