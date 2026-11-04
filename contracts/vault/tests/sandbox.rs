//! One local deploy of the release wasm. Ignored by `cargo test`.
//! `cargo test --test sandbox -- --ignored --nocapture`

use ed25519_dalek::{Signer, SigningKey};
use serde_json::{json, Value};
use sha2::{Digest, Sha256};

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

fn commit_bytes(vault_id: &str, round: u64, commitment: [u8; 32], version: [u8; 32]) -> Vec<u8> {
    let mut out = b"bouncer.commit.v1".to_vec();
    out.extend((vault_id.len() as u32).to_le_bytes());
    out.extend(vault_id.as_bytes());
    out.extend(round.to_le_bytes());
    out.extend(commitment);
    out.extend(version);
    out
}

#[tokio::test]
#[ignore]
async fn a_sponsor_creates_seals_and_the_runtime_checks_the_guard_signature() {
    let wasm = std::fs::read(concat!(env!("CARGO_MANIFEST_DIR"), "/target/wasm32-unknown-unknown/release/vault.wasm"))
        .expect("release wasm");
    let worker = near_workspaces::sandbox().await.expect("sandbox");
    let contract = worker.dev_deploy(&wasm).await.expect("deploy");
    let owner = worker.dev_create_account().await.expect("owner");
    let sponsor = worker.dev_create_account().await.expect("sponsor");
    let guard = SigningKey::from_bytes(&[1u8; 32]);
    let guard_pk = guard.verifying_key().to_bytes();
    let ok = |r: near_workspaces::result::ExecutionFinalResult, what: &str| assert!(r.is_success(), "{what}: {r:?}");

    ok(owner.call(contract.id(), "init").args_json(json!({"owner": owner.id(), "fee_bps": 0})).transact().await.unwrap(), "init");
    ok(owner.call(contract.id(), "set_default_guard_key").args_json(json!({"guard_pk": guard_pk.to_vec()})).transact().await.unwrap(), "key");
    ok(
        owner
            .call(contract.id(), "set_limits")
            .args_json(json!({"limits": {
                "self_serve": true, "max_cap": 5_000_000, "max_cracks": 4,
                "min_lock_ns": 60_000_000_000u64, "max_lock_ns": 86_400_000_000_000u64,
                "max_open_lead_ns": 86_400_000_000_000u64, "max_spec_ct": 8300, "max_card": 300,
                "default_guard_pk": null, "reserved_prefixes": ["velvet"]
            }}))
            .transact()
            .await
            .unwrap(),
        "limits",
    );

    // A wasm built without `--cfg near` reports every panic as a bare trap. Keep the reason visible.
    let refused = sponsor.call(contract.id(), "set_default_guard_key").args_json(json!({"guard_pk": vec![1u8; 32]})).transact().await.unwrap();
    assert!(
        refused.clone().into_result().err().map(|e| e.to_string()).unwrap_or_default().contains("not owner"),
        "the release wasm lost its panic messages: {refused:?}"
    );
    let before = sponsor.view_account().await.unwrap().balance;
    ok(
        sponsor
            .call(contract.id(), "create_sponsor_vault")
            .args_json(json!({"vault_id": "anchor", "rule": "PayTheBill", "cap": 1_000_000, "lock_ns": 60_000_000_000u64, "max_cracks": 2}))
            .deposit(near_workspaces::types::NearToken::from_near(1))
            .transact()
            .await
            .unwrap(),
        "create",
    );
    let listed: Vec<String> = contract.view("list_vaults").args_json(json!({"from_index": 0, "limit": 10})).await.unwrap().json().unwrap();
    assert_eq!(listed, vec!["anchor".to_string()]);
    let ct = vec![7u8; 4_000];
    let hash = [5u8; 32];
    ok(
        sponsor
            .call(contract.id(), "set_spec")
            .args_json(json!({"vault_id": "anchor", "spec_ct": base64_of(&ct), "spec_hash": hash.to_vec(), "card": "The Rusty Anchor."}))
            .deposit(near_workspaces::types::NearToken::from_near(1))
            .transact()
            .await
            .unwrap(),
        "spec",
    );
    let spent = before.as_yoctonear() - sponsor.view_account().await.unwrap().balance.as_yoctonear();
    assert!(spent < 300_000_000_000_000_000_000_000, "the excess deposit was not returned: {spent}");

    let vault: Value = contract.view("get_vault").args_json(json!({"vault_id": "anchor"})).await.unwrap().json().unwrap();
    assert_eq!(vault["sponsor"], sponsor.id().as_str());
    assert_eq!(vault["guard_pk"], json!(guard_pk.to_vec()));
    assert_eq!(vault["spec_hash"], json!(hash.to_vec()));
    let stored: String = contract.view("get_spec").args_json(json!({"vault_id": "anchor"})).await.unwrap().json().unwrap();
    assert_eq!(stored, base64_of(&ct));

    let mut input = b"bouncer.guard.v2".to_vec();
    input.extend(b"bouncer.guard.v1");
    input.extend([0u8; 16]);
    input.extend(hash);
    let version: [u8; 32] = Sha256::digest(&input).into();
    let commitment = [9u8; 32];
    let opens: u64 = worker.view_block().await.unwrap().timestamp();

    // The pinned USDC account is an implicit account. In the sandbox we can give it a key we hold and
    // deposit as the token would, so the round has a pot.
    let usdc_id: near_workspaces::AccountId = "3e2210e1184b45b64c8a434c0a7e7b23cc04ea7eb7a6c3c32520d03d4afcb8af".parse().unwrap();
    let usdc_key = near_workspaces::types::SecretKey::from_random(near_workspaces::types::KeyType::ED25519);
    worker
        .patch(&usdc_id)
        .account(near_workspaces::types::AccountDetailsPatch::default().balance(near_workspaces::types::NearToken::from_near(10)))
        .access_key(usdc_key.public_key(), near_workspaces::types::AccessKey::full_access())
        .transact()
        .await
        .unwrap();
    let usdc = near_workspaces::Account::from_secret_key(usdc_id, usdc_key, &worker);
    ok(
        usdc.call(contract.id(), "ft_on_transfer")
            .args_json(json!({"sender_id": sponsor.id(), "amount": "10000000", "msg": "anchor"}))
            .transact()
            .await
            .unwrap(),
        "deposit",
    );

    let call = |sig: Vec<u8>| {
        sponsor
            .call(contract.id(), "commit_round")
            .args_json(json!({"vault_id": "anchor", "commitment": commitment.to_vec(), "guard_version": version.to_vec(), "opens_at": opens, "guard_signature": sig}))
            .transact()
    };
    let view = || async {
        let v: Value = contract.view("get_vault").args_json(json!({"vault_id": "anchor"})).await.unwrap().json().unwrap();
        v
    };
    // A release wasm reports every panic as a trap, so the proof is the outcome: the runtime's own
    // ed25519 check refuses the bad signatures and accepts the guard's.
    let other = SigningKey::from_bytes(&[2u8; 32]).sign(&commit_bytes("anchor", 1, commitment, version)).to_bytes().to_vec();
    for sig in [vec![0u8; 64], other] {
        assert!(call(sig).await.unwrap().is_failure());
        assert_eq!(view().await["open"], false);
    }
    let wrong_round = guard.sign(&commit_bytes("anchor", 2, commitment, version)).to_bytes().to_vec();
    assert!(call(wrong_round).await.unwrap().is_failure());
    assert_eq!(view().await["open"], false);
    let signed = guard.sign(&commit_bytes("anchor", 1, commitment, version)).to_bytes().to_vec();
    ok(call(signed).await.unwrap(), "commit");
    let after = view().await;
    assert_eq!(after["open"], true);
    assert_eq!(after["round"], 1);
    assert_eq!(after["guard_version"], json!(version.to_vec()));
    assert_eq!(after["spec_locked"], true);
}

fn base64_of(bytes: &[u8]) -> String {
    const T: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut out = String::new();
    for chunk in bytes.chunks(3) {
        let n = (u32::from(chunk[0]) << 16) | (u32::from(*chunk.get(1).unwrap_or(&0)) << 8) | u32::from(*chunk.get(2).unwrap_or(&0));
        out.push(T[(n >> 18) as usize & 63] as char);
        out.push(T[(n >> 12) as usize & 63] as char);
        out.push(if chunk.len() > 1 { T[(n >> 6) as usize & 63] as char } else { '=' });
        out.push(if chunk.len() > 2 { T[n as usize & 63] as char } else { '=' });
    }
    out
}
