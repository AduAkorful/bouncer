use super::support::*;
use crate::state::*;
use crate::verdict::commit_bytes;
use near_sdk::json_types::{Base64VecU8, U128};
use near_sdk::mock::MockAction;
use near_sdk::test_utils::get_created_receipts;
use near_sdk::NearToken;

const KEEPER: &str = "keeper.test.near";
const STRANGER: &str = "stranger.test.near";
const NEAR: NearToken = NearToken::from_near(1);

fn limits() -> Limits {
    Limits {
        self_serve: true,
        max_cap: 5_000_000,
        max_cracks: 4,
        min_lock_ns: MIN_LOCK_NS,
        max_lock_ns: DAY_NS,
        max_open_lead_ns: DAY_NS,
        max_spec_ct: 8_300,
        max_card: 300,
        default_guard_pk: None,
        reserved_prefixes: vec!["velvet".into()],
    }
}

/// A fresh registry the owner has opened to sponsors, with the guard's key as the default.
fn registry() -> (World, Key) {
    let mut world = World::new(0);
    let guard = Key::from_seed(1);
    world.at(OWNER, 0);
    world.contract.set_default_guard_key(guard.pk().to_vec());
    world.contract.set_limits(limits());
    (world, guard)
}

fn as_sponsor(_world: &mut World, now: u64, attached: NearToken) {
    switch(SPONSOR, now, attached, NearToken::from_near(50));
}

fn create(world: &mut World, vault: &str) {
    as_sponsor(world, 0, NEAR);
    let _ = world.contract.create_sponsor_vault(vault.into(), PayoutRule::PayTheBill, 1_000_000, MIN_LOCK_NS, 2);
}

fn spec_ct() -> Base64VecU8 {
    Base64VecU8::from(vec![7u8; 4_000])
}

fn seal(world: &mut World, vault: &str) {
    as_sponsor(world, 0, NEAR);
    let _ = world.contract.set_spec(vault.into(), spec_ct(), hash(5), "The Rusty Anchor, owed money.".into());
}

fn funded(world: &mut World, vault: &str) {
    assert_eq!(deposit(world, vault, &id(SPONSOR), 10_000_000, 0), 0);
}

fn version() -> [u8; 32] {
    spec_guard_version(&hash(5))
}

fn commit_as(world: &mut World, who: &str, guard: &Key, vault: &str, opens_at: u64) {
    world.at(who, 0);
    commit(world, guard, vault, hash(9), version(), opens_at);
}

/// A sponsor vault that is created, sealed, funded, and ready for a first round.
fn ready() -> (World, Key) {
    let (mut world, guard) = registry();
    create(&mut world, "anchor");
    seal(&mut world, "anchor");
    funded(&mut world, "anchor");
    (world, guard)
}

fn vault(world: &World, id: &str) -> Vault {
    world.contract.get_vault(id.into()).unwrap()
}

#[test]
fn a_fresh_registry_is_closed_to_sponsors() {
    let world = World::new(0);
    let limits = world.contract.get_limits();
    assert!(!limits.self_serve);
    assert!(limits.default_guard_pk.is_none());
    assert!(world.contract.get_spec("x".into()).is_none());
}

#[test]
#[should_panic(expected = "closed")]
fn a_sponsor_cannot_create_while_self_serve_is_off() {
    let mut world = World::new(0);
    as_sponsor(&mut world, 0, NEAR);
    let _ = world.contract.create_sponsor_vault("anchor".into(), PayoutRule::PayTheBill, 1, MIN_LOCK_NS, 1);
}

#[test]
#[should_panic(expected = "no guard")]
fn creation_needs_a_default_guard_key() {
    let mut world = World::new(0);
    world.at(OWNER, 0);
    world.contract.set_limits(limits());
    as_sponsor(&mut world, 0, NEAR);
    let _ = world.contract.create_sponsor_vault("anchor".into(), PayoutRule::PayTheBill, 1, MIN_LOCK_NS, 1);
}

#[test]
fn creation_stores_a_sponsor_vault_with_the_default_key_and_refunds_the_excess() {
    let (mut world, guard) = registry();
    create(&mut world, "anchor");
    let v = vault(&world, "anchor");
    assert_eq!(v.sponsor, id(SPONSOR));
    assert_eq!(v.guard_pk, Some(guard.pk()));
    assert!(!v.ticketed && v.challenge_end.is_none() && !v.open);
    assert_eq!((v.cap, v.max_cracks), (1_000_000, 2));
    let refund = get_created_receipts().into_iter().any(|r| {
        r.receiver_id == id(SPONSOR)
            && r.actions.iter().any(|a| matches!(a, MockAction::Transfer { deposit, .. } if deposit.as_yoctonear() > 0 && *deposit < NEAR))
    });
    assert!(refund, "the excess deposit was not returned");
}

#[test]
#[should_panic(expected = "attach near")]
fn a_short_deposit_rolls_the_creation_back() {
    let (mut world, _) = registry();
    as_sponsor(&mut world, 0, NearToken::from_yoctonear(1));
    let _ = world.contract.create_sponsor_vault("anchor".into(), PayoutRule::PayTheBill, 1_000_000, MIN_LOCK_NS, 2);
}

#[test]
#[should_panic(expected = "reserved id")]
fn a_reserved_prefix_is_refused() {
    let (mut world, _) = registry();
    create(&mut world, "velvet-9");
}

#[test]
#[should_panic(expected = "vault exists")]
fn a_used_id_is_refused() {
    let (mut world, _) = registry();
    create(&mut world, "anchor");
    create(&mut world, "anchor");
}

#[test]
#[should_panic(expected = "cap")]
fn a_cap_above_the_limit_is_refused() {
    let (mut world, _) = registry();
    as_sponsor(&mut world, 0, NEAR);
    let _ = world.contract.create_sponsor_vault("anchor".into(), PayoutRule::PayTheBill, 5_000_001, MIN_LOCK_NS, 2);
}

#[test]
#[should_panic(expected = "lock")]
fn a_lock_outside_the_limits_is_refused() {
    let (mut world, _) = registry();
    as_sponsor(&mut world, 0, NEAR);
    let _ = world.contract.create_sponsor_vault("anchor".into(), PayoutRule::PayTheBill, 1, DAY_NS + 1, 2);
}

#[test]
#[should_panic(expected = "max cracks")]
fn too_many_cracks_are_refused() {
    let (mut world, _) = registry();
    as_sponsor(&mut world, 0, NEAR);
    let _ = world.contract.create_sponsor_vault("anchor".into(), PayoutRule::PayTheBill, 1, MIN_LOCK_NS, 5);
}

#[test]
fn set_spec_stores_the_ciphertext_hash_and_card() {
    let (mut world, _) = registry();
    create(&mut world, "anchor");
    seal(&mut world, "anchor");
    let v = vault(&world, "anchor");
    assert_eq!(v.spec_hash, Some(hash(5)));
    assert_eq!(v.card.as_deref(), Some("The Rusty Anchor, owed money."));
    assert_eq!(world.contract.get_spec("anchor".into()).unwrap().0, vec![7u8; 4_000]);
}

#[test]
#[should_panic(expected = "not sponsor")]
fn only_the_sponsor_sets_a_spec() {
    let (mut world, _) = registry();
    create(&mut world, "anchor");
    switch(STRANGER, 0, NEAR, NearToken::from_near(50));
    let _ = world.contract.set_spec("anchor".into(), spec_ct(), hash(5), "card".into());
}

#[test]
#[should_panic(expected = "spec size")]
fn an_oversized_spec_is_refused() {
    let (mut world, _) = registry();
    create(&mut world, "anchor");
    as_sponsor(&mut world, 0, NEAR);
    let _ = world.contract.set_spec("anchor".into(), Base64VecU8::from(vec![1u8; 8_301]), hash(5), "card".into());
}

#[test]
#[should_panic(expected = "card size")]
fn an_oversized_card_is_refused() {
    let (mut world, _) = registry();
    create(&mut world, "anchor");
    as_sponsor(&mut world, 0, NEAR);
    let _ = world.contract.set_spec("anchor".into(), spec_ct(), hash(5), "x".repeat(301));
}

#[test]
#[should_panic(expected = "card text")]
fn a_card_with_a_control_character_is_refused() {
    let (mut world, _) = registry();
    create(&mut world, "anchor");
    as_sponsor(&mut world, 0, NEAR);
    let _ = world.contract.set_spec("anchor".into(), spec_ct(), hash(5), "bad\u{0007}card".into());
}

#[test]
#[should_panic(expected = "attach near")]
fn a_spec_needs_a_deposit_for_its_storage() {
    let (mut world, _) = registry();
    create(&mut world, "anchor");
    as_sponsor(&mut world, 0, NearToken::from_yoctonear(1));
    let _ = world.contract.set_spec("anchor".into(), spec_ct(), hash(5), "card".into());
}

#[test]
#[should_panic(expected = "spec locked")]
fn the_spec_is_fixed_after_the_first_round() {
    let (mut world, guard) = ready();
    commit_as(&mut world, SPONSOR, &guard, "anchor", 0);
    assert!(vault(&world, "anchor").spec_locked);
    world.at(OWNER, 1);
    world.contract.close_round("anchor".into());
    seal(&mut world, "anchor");
}

#[test]
#[should_panic(expected = "door open")]
fn a_spec_cannot_change_while_the_door_is_open() {
    let (mut world, guard) = ready();
    commit_as(&mut world, SPONSOR, &guard, "anchor", 0);
    seal(&mut world, "anchor");
}

#[test]
fn a_sponsor_commits_a_round_the_guard_signed() {
    let (mut world, guard) = ready();
    commit_as(&mut world, SPONSOR, &guard, "anchor", 0);
    let v = vault(&world, "anchor");
    assert!(v.open && v.round == 1);
    assert_eq!(v.guard_version, Some(version()));
    assert_eq!(v.day_pot, 2_000_000);
    books(&world.contract, &["anchor"]);
}

#[test]
#[should_panic(expected = "not sponsor")]
fn a_stranger_cannot_commit() {
    let (mut world, guard) = ready();
    commit_as(&mut world, STRANGER, &guard, "anchor", 0);
}

#[test]
#[should_panic(expected = "bad signature")]
fn an_unsigned_commit_is_refused() {
    let (mut world, _) = ready();
    world.at(SPONSOR, 0);
    world.contract.commit_round("anchor".into(), hash(9), version(), 0, vec![0u8; 64]);
}

#[test]
#[should_panic(expected = "bad signature")]
fn a_short_signature_is_refused() {
    let (mut world, _) = ready();
    world.at(SPONSOR, 0);
    world.contract.commit_round("anchor".into(), hash(9), version(), 0, vec![0u8; 10]);
}

#[test]
#[should_panic(expected = "bad signature")]
fn a_signature_by_another_key_is_refused() {
    let (mut world, _) = ready();
    commit_as(&mut world, SPONSOR, &Key::from_seed(9), "anchor", 0);
}

fn commit_with(world: &mut World, guard: &Key, vault_id: &str, round: u64, commitment: [u8; 32], signed_version: [u8; 32], used_version: [u8; 32]) {
    world.at(SPONSOR, 0);
    let sig = guard.sign(&commit_bytes(vault_id, round, commitment, signed_version));
    world.contract.commit_round(vault_id.into(), hash(9), used_version, 0, sig);
}

#[test]
#[should_panic(expected = "bad signature")]
fn a_signature_for_another_round_is_refused() {
    let (mut world, guard) = ready();
    commit_with(&mut world, &guard, "anchor", 2, hash(9), version(), version());
}

#[test]
#[should_panic(expected = "bad signature")]
fn a_signature_for_another_vault_is_refused() {
    let (mut world, guard) = ready();
    world.at(SPONSOR, 0);
    let sig = guard.sign(&commit_bytes("other", 1, hash(9), version()));
    world.contract.commit_round("anchor".into(), hash(9), version(), 0, sig);
}

#[test]
#[should_panic(expected = "bad signature")]
fn a_signature_for_another_commitment_is_refused() {
    let (mut world, guard) = ready();
    commit_with(&mut world, &guard, "anchor", 1, hash(10), version(), version());
}

#[test]
#[should_panic(expected = "bad signature")]
fn a_signature_under_another_domain_is_refused() {
    let (mut world, guard) = ready();
    world.at(SPONSOR, 0);
    let mut msg = b"bouncer.verdict.v1".to_vec();
    msg.extend(&commit_bytes("anchor", 1, hash(9), version())[COMMIT_DOMAIN.len()..]);
    world.contract.commit_round("anchor".into(), hash(9), version(), 0, guard.sign(&msg));
}

#[test]
#[should_panic(expected = "guard version")]
fn a_round_must_carry_the_spec_derived_guard_version() {
    let (mut world, guard) = ready();
    commit_with(&mut world, &guard, "anchor", 1, hash(9), hash(8), hash(8));
}

#[test]
#[should_panic(expected = "opens at")]
fn a_sponsor_cannot_open_too_far_ahead() {
    let (mut world, guard) = ready();
    commit_as(&mut world, SPONSOR, &guard, "anchor", DAY_NS + 1);
}

#[test]
#[should_panic(expected = "suspended")]
fn a_suspended_vault_cannot_commit() {
    let (mut world, guard) = ready();
    world.at(OWNER, 0);
    world.contract.suspend_vault("anchor".into(), true);
    commit_as(&mut world, SPONSOR, &guard, "anchor", 0);
}

#[test]
#[should_panic(expected = "no spec")]
fn a_sponsor_cannot_run_a_vault_with_no_spec() {
    let (mut world, guard) = registry();
    create(&mut world, "anchor");
    funded(&mut world, "anchor");
    world.at(SPONSOR, 0);
    commit(&mut world, &guard, "anchor", hash(9), hash(8), 0);
}

#[test]
fn the_owner_can_still_commit_a_vault_with_no_spec() {
    let d = pay_door();
    assert!(d.vault().open && d.vault().spec_hash.is_none());
}

#[test]
fn suspending_blocks_a_round_and_not_the_pot() {
    let (mut world, _) = ready();
    world.at(OWNER, 0);
    world.contract.suspend_vault("anchor".into(), true);
    assert!(vault(&world, "anchor").suspended);
    switch(SPONSOR, 1, NearToken::from_yoctonear(0), NearToken::from_near(50));
    world.contract.reclaim("anchor".into());
    assert_eq!(vault(&world, "anchor").refund_in_flight, 10_000_000);
}

#[test]
#[should_panic(expected = "not owner")]
fn only_the_owner_suspends() {
    let (mut world, _) = ready();
    world.at(SPONSOR, 0);
    world.contract.suspend_vault("anchor".into(), true);
}

#[test]
fn a_keeper_opens_a_round_and_nothing_else() {
    let (mut world, guard) = ready();
    world.at(SPONSOR, 0);
    world.contract.set_keeper("anchor".into(), Some(id(KEEPER)));
    assert_eq!(vault(&world, "anchor").keeper, Some(id(KEEPER)));
    commit_as(&mut world, KEEPER, &guard, "anchor", 0);
    assert!(vault(&world, "anchor").open);
}

#[test]
#[should_panic(expected = "not owner")]
fn a_keeper_cannot_change_the_cap() {
    let (mut world, _) = ready();
    world.at(SPONSOR, 0);
    world.contract.set_keeper("anchor".into(), Some(id(KEEPER)));
    world.at(KEEPER, 0);
    world.contract.set_cap("anchor".into(), 1);
}

#[test]
#[should_panic(expected = "not sponsor")]
fn a_keeper_cannot_reclaim() {
    let (mut world, _) = ready();
    world.at(SPONSOR, 0);
    world.contract.set_keeper("anchor".into(), Some(id(KEEPER)));
    switch(KEEPER, 1, NearToken::from_yoctonear(0), NearToken::from_near(50));
    world.contract.reclaim("anchor".into());
}

#[test]
#[should_panic(expected = "not sponsor")]
fn a_keeper_cannot_set_the_spec_or_the_keeper() {
    let (mut world, _) = ready();
    world.at(SPONSOR, 0);
    world.contract.set_keeper("anchor".into(), Some(id(KEEPER)));
    world.at(KEEPER, 0);
    world.contract.set_keeper("anchor".into(), None);
}

#[test]
#[should_panic(expected = "not sponsor")]
fn a_removed_keeper_cannot_commit() {
    let (mut world, guard) = ready();
    world.at(SPONSOR, 0);
    world.contract.set_keeper("anchor".into(), Some(id(KEEPER)));
    world.contract.set_keeper("anchor".into(), None);
    commit_as(&mut world, KEEPER, &guard, "anchor", 0);
}

#[test]
fn a_sponsor_sets_cap_and_lock_inside_the_limits() {
    let (mut world, _) = ready();
    world.at(SPONSOR, 0);
    world.contract.set_cap("anchor".into(), 3_000_000);
    world.contract.set_lock("anchor".into(), 2 * MIN_LOCK_NS);
    let v = vault(&world, "anchor");
    assert_eq!((v.cap, v.lock_ns), (3_000_000, 2 * MIN_LOCK_NS));
}

#[test]
#[should_panic(expected = "cap")]
fn a_sponsor_cannot_raise_the_cap_past_the_limit() {
    let (mut world, _) = ready();
    world.at(SPONSOR, 0);
    world.contract.set_cap("anchor".into(), 5_000_001);
}

#[test]
#[should_panic(expected = "lock")]
fn a_sponsor_cannot_set_a_lock_past_the_limit() {
    let (mut world, _) = ready();
    world.at(SPONSOR, 0);
    world.contract.set_lock("anchor".into(), DAY_NS + 1);
}

#[test]
#[should_panic(expected = "not owner")]
fn a_stranger_cannot_set_the_cap() {
    let (mut world, _) = ready();
    world.at(STRANGER, 0);
    world.contract.set_cap("anchor".into(), 1);
}

#[test]
fn the_owner_is_not_held_to_the_sponsor_limits() {
    let (mut world, _) = ready();
    world.at(OWNER, 0);
    world.contract.set_cap("anchor".into(), 50_000_000);
    assert_eq!(vault(&world, "anchor").cap, 50_000_000);
}

#[test]
fn reclaim_returns_the_pot_and_keeps_the_books() {
    let (mut world, _) = ready();
    switch(SPONSOR, 1, NearToken::from_yoctonear(0), NearToken::from_near(50));
    world.contract.reclaim("anchor".into());
    let v = vault(&world, "anchor");
    assert_eq!((v.pot, v.refund_in_flight), (0, 10_000_000));
    books(&world.contract, &["anchor"]);
    world.at(CONTRACT, 1);
    world.contract.on_transfer_done(Outflow::Refund { vault_id: "anchor".into() }, U128(10_000_000), Ok(()));
    assert_eq!(vault(&world, "anchor").refund_in_flight, 0);
    assert_eq!(world.contract.get_accounted(), 0);
}

#[test]
fn a_failed_reclaim_puts_the_pot_back() {
    let (mut world, _) = ready();
    switch(SPONSOR, 1, NearToken::from_yoctonear(0), NearToken::from_near(50));
    world.contract.reclaim("anchor".into());
    world.at(CONTRACT, 1);
    world.contract.on_transfer_done(Outflow::Refund { vault_id: "anchor".into() }, U128(10_000_000), Err(near_sdk::PromiseError::Failed));
    assert_eq!(vault(&world, "anchor").pot, 10_000_000);
    assert_eq!(vault(&world, "anchor").refund_in_flight, 0);
    books(&world.contract, &["anchor"]);
}

#[test]
#[should_panic(expected = "door open")]
fn reclaim_waits_for_the_round_to_end() {
    let (mut world, guard) = ready();
    commit_as(&mut world, SPONSOR, &guard, "anchor", 0);
    switch(SPONSOR, 1, NearToken::from_yoctonear(0), NearToken::from_near(50));
    world.contract.reclaim("anchor".into());
}

#[test]
#[should_panic(expected = "not sponsor")]
fn only_the_sponsor_reclaims() {
    let (mut world, _) = ready();
    switch(STRANGER, 1, NearToken::from_yoctonear(0), NearToken::from_near(50));
    world.contract.reclaim("anchor".into());
}

#[test]
#[should_panic(expected = "challenge")]
fn a_challenge_vault_uses_end_challenge_not_reclaim() {
    let mut door = pay_door();
    door.world.at(OWNER, 1);
    door.world.contract.close_round(door.vault_id.clone());
    switch(SPONSOR, 1, NearToken::from_yoctonear(0), NearToken::from_near(50));
    door.world.contract.reclaim(door.vault_id.clone());
}

#[test]
#[should_panic(expected = "reserved remains")]
fn reclaim_cannot_touch_a_reserved_crack() {
    let mut door = pay_door();
    door.submit("r1", "p1", 20, 1, 1);
    door.world.at(OWNER, 1);
    door.world.contract.close_round(door.vault_id.clone());
    let mut open_ended = door.vault();
    open_ended.challenge_end = None;
    door.world.contract.put_vault("velvet", open_ended);
    switch(SPONSOR, 1, NearToken::from_yoctonear(0), NearToken::from_near(50));
    door.world.contract.reclaim("velvet".into());
}

#[test]
#[should_panic(expected = "limits")]
fn limits_must_be_sane() {
    let mut world = World::new(0);
    world.at(OWNER, 0);
    world.contract.set_limits(Limits { max_cap: 0, ..limits() });
}

#[test]
#[should_panic(expected = "limits")]
fn an_inverted_lock_range_is_refused() {
    let mut world = World::new(0);
    world.at(OWNER, 0);
    world.contract.set_limits(Limits { min_lock_ns: DAY_NS, max_lock_ns: MIN_LOCK_NS, ..limits() });
}

#[test]
#[should_panic(expected = "not owner")]
fn only_the_owner_sets_limits() {
    let mut world = World::new(0);
    world.at(SPONSOR, 0);
    world.contract.set_limits(limits());
}

#[test]
fn set_limits_keeps_the_default_guard_key() {
    let (mut world, guard) = registry();
    world.at(OWNER, 0);
    world.contract.set_limits(Limits { max_cap: 9, ..limits() });
    assert_eq!(world.contract.get_limits().default_guard_pk, Some(guard.pk()));
    assert_eq!(world.contract.get_limits().max_cap, 9);
}

#[test]
#[should_panic(expected = "not owner")]
fn only_the_owner_sets_the_default_key() {
    let mut world = World::new(0);
    world.at(SPONSOR, 0);
    world.contract.set_default_guard_key(vec![1u8; 32]);
}

#[test]
fn the_commit_bytes_match_the_guard_fixture() {
    let bytes = commit_bytes("velvet-1", 2, [1u8; 32], [2u8; 32]);
    let fixture = include_str!("../../../../guard/fixtures/commit-bytes.hex").trim();
    assert_eq!(hex(&bytes), fixture);
}

#[test]
fn the_spec_guard_version_matches_the_guard() {
    assert_eq!(hex(&spec_guard_version(&[1u8; 32])), "e5c6d557967eac9c8244e54c495e25acf486289322d8a3ec95c5cce442a06eaf");
}

fn hex(bytes: &[u8]) -> String {
    bytes.iter().map(|b| format!("{b:02x}")).collect()
}

#[test]
fn list_vaults_pages_every_vault_once_in_creation_order() {
    let (mut world, _) = registry();
    world.at(OWNER, 0);
    world.contract.create_vault("alpha".into(), id(SPONSOR), PayoutRule::PayTheBill, 1, MIN_LOCK_NS, 1, None, false);
    create(&mut world, "beta");
    create(&mut world, "gamma");
    assert_eq!(world.contract.list_vaults(0, 10), vec!["alpha", "beta", "gamma"]);
    assert_eq!(world.contract.list_vaults(1, 1), vec!["beta"]);
    assert_eq!(world.contract.list_vaults(2, 100), vec!["gamma"]);
    assert!(world.contract.list_vaults(3, 10).is_empty());
    assert!(world.contract.list_vaults(u32::MAX, u32::MAX).is_empty());
}

#[test]
fn a_refused_creation_adds_no_id() {
    let (mut world, _) = registry();
    create(&mut world, "beta");
    let again = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| create(&mut world, "beta")));
    assert!(again.is_err());
    assert_eq!(world.contract.list_vaults(0, 10), vec!["beta"]);
}
