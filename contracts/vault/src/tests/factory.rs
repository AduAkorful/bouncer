use super::support::*;
use crate::factory::IsolateInit;
use crate::VaultContract;
use near_sdk::json_types::Base64VecU8;
use near_sdk::mock::MockAction;
use near_sdk::test_utils::get_created_receipts;
use near_sdk::{env, NearToken, PublicKey};

#[test]
fn isolate_leaves_the_registry_pot_unchanged() {
    let mut door = pay_door();
    let pot = door.vault().pot;
    let accounted = door.world.contract.get_accounted();
    let wasm = b"\0asm\x01\x00\x00\x00".to_vec();
    door.world.at(OWNER, 1);
    door.world.contract.publish_wasm(Base64VecU8::from(wasm.clone()));
    switch(OWNER, 1, NearToken::from_near(5), NearToken::from_near(50));
    let owner_pk: PublicKey = vec![0u8; 33].try_into().unwrap();
    let _ = door.world.contract.isolate(
        "sponsor".into(),
        IsolateInit { owner: id(SPONSOR), owner_pk, fee_bps: 25 },
    );
    assert_eq!(door.vault().pot, pot);
    assert_eq!(door.world.contract.get_accounted(), accounted);
    assert!(door.world.contract.get_vault("sponsor.vault.test.near".into()).is_none());
    let receipts = get_created_receipts();
    let deployed = receipts.iter().any(|receipt| {
        receipt.receiver_id == id("sponsor.vault.test.near")
            && receipt.actions.iter().any(|action| {
                matches!(action, MockAction::DeployContract { code, .. } if code == &wasm)
            })
            && receipt.actions.iter().any(|action| matches!(action, MockAction::CreateAccount { .. }))
            && receipt.actions.iter().any(|action| matches!(action, MockAction::AddKeyWithFullAccess { .. }))
            && !receipt.actions.iter().any(|action| {
                matches!(action, MockAction::DeployGlobalContract { .. } | MockAction::UseGlobalContract { .. })
            })
    });
    assert!(deployed, "isolate did not deploy the published wasm onto the subaccount");
    let init = receipts.iter().flat_map(|receipt| receipt.actions.iter()).any(|action| {
        if let MockAction::FunctionCallWeight { method_name, args, .. } = action {
            method_name == b"init" && args.windows(SPONSOR.len()).any(|window| window == SPONSOR.as_bytes())
        } else {
            false
        }
    });
    assert!(init);
}

#[test]
fn migrate_reads_v1() {
    let door = pay_door();
    env::state_write(&door.world.contract);
    drop(door);
    switch(CONTRACT, 0, NearToken::from_yoctonear(0), NearToken::from_near(50));
    let migrated = VaultContract::migrate();
    assert_eq!(migrated.get_owner(), id(OWNER));
    let vault = migrated.get_vault("velvet".into()).expect("vault survived migrate");
    assert_eq!(vault.sponsor, id(SPONSOR));
    assert!(vault.open);
}

#[test]
fn update_contract_deploys_input_and_calls_migrate() {
    let door = pay_door();
    with_input(OWNER, b"next-wasm");
    let _ = &door;
    let _ = door.world.contract.update_contract();
    let receipts = get_created_receipts();
    assert!(receipts.iter().any(|receipt| {
        receipt.receiver_id == id(CONTRACT)
            && receipt.actions.iter().any(|action| {
                matches!(action, MockAction::DeployContract { code, .. } if code == b"next-wasm")
            })
            && receipt.actions.iter().any(|action| {
                matches!(action, MockAction::FunctionCallWeight { method_name, .. } if method_name == b"migrate")
            })
    }));
}

#[test]
#[should_panic(expected = "not owner")]
fn stranger_cannot_isolate() {
    let mut door = pay_door();
    door.world.at(OWNER, 1);
    door.world.contract.publish_wasm(Base64VecU8::from(b"\0asm\x01\x00\x00\x00".to_vec()));
    switch(PLAYER, 1, NearToken::from_near(5), NearToken::from_near(50));
    let owner_pk: PublicKey = vec![0u8; 33].try_into().unwrap();
    let _ = door.world.contract.isolate(
        "sponsor".into(),
        IsolateInit { owner: id(SPONSOR), owner_pk, fee_bps: 0 },
    );
}
