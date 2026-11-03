//! One local deploy of the release wasm. Ignored by `cargo test`.
//! `cargo test --test sandbox -- --ignored --nocapture`

use serde_json::{json, Value};

fn zero(value: &Value) -> bool {
    value == &json!(0) || value == &json!("0")
}

#[tokio::test]
#[ignore]
async fn release_wasm_deploys_and_records_a_vault() {
    let wasm = std::fs::read(concat!(
        env!("CARGO_MANIFEST_DIR"),
        "/target/wasm32-unknown-unknown/release/vault.wasm"
    ))
    .expect("release wasm");
    let worker = near_workspaces::sandbox().await.expect("sandbox");
    let contract = worker.dev_deploy(&wasm).await.expect("deploy");
    let owner = worker.dev_create_account().await.expect("owner");
    let sponsor = worker.dev_create_account().await.expect("sponsor");

    let init = owner
        .call(contract.id(), "init")
        .args_json(json!({"owner": owner.id(), "fee_bps": 0}))
        .transact()
        .await
        .expect("init tx");
    assert!(init.is_success(), "{init:?}");

    let got_owner: String = contract.view("get_owner").await.expect("owner view").json().expect("owner");
    assert_eq!(got_owner, owner.id().to_string());
    let usdc: String = contract
        .view("get_usdc_account")
        .await
        .expect("usdc view")
        .json()
        .expect("usdc");
    assert_eq!(
        usdc,
        "3e2210e1184b45b64c8a434c0a7e7b23cc04ea7eb7a6c3c32520d03d4afcb8af"
    );

    let created = owner
        .call(contract.id(), "create_vault")
        .args_json(json!({
            "vault_id": "velvet",
            "sponsor": sponsor.id(),
            "rule": "PayTheBill",
            "cap": 1_000_000,
            "lock_ns": 60_000_000_000u64,
            "max_cracks": 1,
            "challenge_end": null,
            "ticketed": false
        }))
        .transact()
        .await
        .expect("create");
    assert!(created.is_success(), "{created:?}");

    let key = owner
        .call(contract.id(), "set_guard_key")
        .args_json(json!({
            "vault_id": "velvet",
            "guard_pk": vec![7u8; 32]
        }))
        .transact()
        .await
        .expect("guard key");
    assert!(key.is_success(), "{key:?}");

    let vault: Value = contract
        .view("get_vault")
        .args_json(json!({"vault_id": "velvet"}))
        .await
        .expect("vault view")
        .json()
        .expect("vault");
    assert_eq!(vault["sponsor"], sponsor.id().as_str());
    assert_eq!(vault["round"], 1);
    assert_eq!(vault["open"], false);
    assert!(zero(&vault["pot"]), "{vault}");
    assert_eq!(vault["guard_pk"], json!(vec![7u8; 32]));

    let stranger = worker.dev_create_account().await.expect("stranger");
    let refused = stranger
        .call(contract.id(), "ft_on_transfer")
        .args_json(json!({
            "sender_id": sponsor.id(),
            "amount": "5000000",
            "msg": "velvet"
        }))
        .transact()
        .await
        .expect("foreign token");
    assert!(refused.is_success(), "{refused:?}");
    let accounted: Value = contract.view("get_accounted").await.expect("accounted").json().expect("balance");
    assert!(zero(&accounted), "{accounted}");
    let after: Value = contract
        .view("get_vault")
        .args_json(json!({"vault_id": "velvet"}))
        .await
        .expect("vault after")
        .json()
        .expect("vault");
    assert!(zero(&after["pot"]), "{after}");
}
