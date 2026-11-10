//! Evidence from the model host rides along with a reply, and never decides one.

use serde_json::json;

use crate::tests::{bill, closed, host, json as parse_json, open, say};
use crate::ledger::{generate, Venue};

fn stand_in_proof() -> serde_json::Value {
    json!({"chat_id": "c1", "signing_address": "0xabc"})
}

#[test]
fn open_carries_the_preflight_when_there_is_one_and_nothing_when_there_is_not() {
    let mut with = host(vec![], closed());
    with.model.preflight = Some(json!({"nonce": "n1"}));
    let out = parse_json(&crate::handle(
        &json!({"op": "open", "vault_id": "velvet-1", "round": 1, "player_id": "ada", "raid_id": "raid-1",
            "claim_pk": hex::encode([7u8; 32]), "venue": "velvet", "rule": "pay-the-bill"})
        .to_string(),
        &mut with,
    ));
    assert_eq!(out["model_proof"]["nonce"], "n1");

    let mut without = host(vec![], closed());
    let out = parse_json(&crate::handle(
        &json!({"op": "open", "vault_id": "velvet-1", "round": 1, "player_id": "ada", "raid_id": "raid-1",
            "claim_pk": hex::encode([7u8; 32]), "venue": "velvet", "rule": "pay-the-bill"})
        .to_string(),
        &mut without,
    ));
    assert!(out.get("model_proof").is_none());
    assert_eq!(out["ok"], true);
}

#[test]
fn a_model_reply_carries_evidence_and_a_canned_one_does_not() {
    let mut h = host(vec![Ok("Evening, friend.".into())], closed());
    h.model.proof = Some(stand_in_proof());
    let blob = open(&mut h, "velvet", "pay-the-bill");
    let out = say(&mut h, &blob, "Hello there");
    assert_eq!(out["reply"], "Evening, friend.");
    assert_eq!(out["proof"]["chat_id"], "c1");

    // A chip is answered without the model, so there is nothing to prove.
    let blob = out["blob"].as_str().unwrap().to_string();
    let chip = say(&mut h, &blob, "Who's on your list tonight?");
    assert!(chip.get("proof").is_none());
}

#[test]
fn a_reply_the_guard_replaced_carries_no_evidence() {
    let lines = generate(&[9u8; 32], "velvet-1", 1, "ada", Venue::Velvet);
    let leaked = format!("Yes, {} is owed.", lines[0].payee);
    let mut h = host(vec![Ok(leaked)], closed());
    h.model.proof = Some(stand_in_proof());
    let blob = open(&mut h, "velvet", "pay-the-bill");
    let out = say(&mut h, &blob, "Hello there");
    assert_eq!(out["reply"], crate::chat::FALLBACK);
    assert!(out.get("proof").is_none());
}

#[test]
fn neither_a_refusal_nor_an_approval_carries_model_evidence() {
    let lines = generate(&[9u8; 32], "velvet-1", 1, "ada", Venue::Velvet);
    let line = lines.iter().find(|l| l.payee == "DJ K-Nova").unwrap();
    let mut h = host(vec![Ok("Go on in.".into())], closed());
    h.model.proof = Some(stand_in_proof());
    let blob = open(&mut h, "velvet", "pay-the-bill");
    let refused = bill(&mut h, &blob, "Nobody", "X-1", "Thing", 1, 1, Some("pay-the-bill"));
    assert_eq!(refused["reply"], crate::chat::REFUSAL);
    assert!(refused.get("proof").is_none());

    let blob = refused["blob"].as_str().unwrap().to_string();
    let approved = bill(&mut h, &blob, &line.payee, &line.reference, &line.item, line.qty, line.unit, Some("pay-the-bill"));
    assert_eq!(approved["reply"], "Approved.");
    assert!(approved.get("proof").is_none());
    assert!(approved["signature"].is_string());
}

#[test]
fn a_retry_gets_the_same_evidence() {
    let mut h = host(vec![Ok("Evening, friend.".into())], closed());
    h.model.proof = Some(stand_in_proof());
    let blob = open(&mut h, "velvet", "pay-the-bill");
    let body = json!({"op":"say","vault_id":"velvet-1","round":1,"player_id":"ada","blob":blob,"text":"Hello there"}).to_string();
    let first = crate::handle(&body, &mut h);
    h.model.proof = None;
    let again = crate::handle(&body, &mut h);
    assert_eq!(first, again);
}
