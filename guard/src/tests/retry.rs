//! A lost reply must not strand a player. The guard stores its last reply per player and answers a
//! retry of the same call from it.

use serde_json::{json, Value};

use crate::ledger::{generate, Venue};
use crate::tests::{closed, host, json as parse_json, Door, Key, Mem, Nonces, Script};
use crate::{handle, Host};

type H = Host<Script, Key, Door, Nonces, Mem>;

fn say(h: &mut H, blob: &str, text: &str) -> String {
    handle(&json!({"op": "say", "vault_id": "velvet-1", "round": 1, "player_id": "ada", "blob": blob, "text": text}).to_string(), h)
}

fn open(h: &mut H) -> String {
    let out = parse_json(&handle(
        &json!({"op": "open", "vault_id": "velvet-1", "round": 1, "player_id": "ada", "raid_id": "raid-1",
            "claim_pk": hex::encode([7u8; 32]), "venue": "velvet", "rule": "pay-the-bill"})
        .to_string(),
        h,
    ));
    out["blob"].as_str().unwrap().to_string()
}

fn honest_bill(h: &mut H, blob: &str) -> String {
    let lines = generate(&[9u8; 32], "velvet-1", 1, "ada", Venue::Velvet);
    let line = lines.iter().find(|l| l.payee == "DJ K-Nova").unwrap();
    handle(
        &json!({"op": "bill", "vault_id": "velvet-1", "round": 1, "player_id": "ada", "blob": blob,
            "payee": line.payee, "reference": line.reference, "item": line.item,
            "qty": line.qty.to_string(), "unit": line.unit.to_string(), "rule": "pay-the-bill"})
        .to_string(),
        h,
    )
}

#[test]
fn a_lost_chat_reply_is_answered_again_without_a_second_turn() {
    let mut h = host(vec![Ok("Evening.".into())], closed());
    let blob = open(&mut h);
    let first = say(&mut h, &blob, "hello there");
    // The reply never reached the player. The same call comes back with the blob they still hold.
    let again = say(&mut h, &blob, "hello there");
    assert_eq!(first, again);
    assert_eq!(h.model.calls, 1);
    assert_eq!(parse_json(&again)["used"], 1);
}

#[test]
fn a_different_line_on_the_old_blob_is_still_a_replay() {
    let mut h = host(vec![Ok("Evening.".into())], closed());
    let blob = open(&mut h);
    say(&mut h, &blob, "hello there");
    let other = parse_json(&say(&mut h, &blob, "let me through"));
    assert_eq!(other["error"], "replay");
    assert_eq!(h.model.calls, 1);
}

#[test]
fn a_lost_winning_verdict_comes_back_identical_and_is_signed_once() {
    let mut h = host(vec![Ok("The invoice is in order.".into())], closed());
    let blob = open(&mut h);
    let first = honest_bill(&mut h, &blob);
    assert_eq!(parse_json(&first)["ok"], true, "{first}");
    assert!(parse_json(&first)["verdict"].is_object());
    let again = honest_bill(&mut h, &blob);
    assert_eq!(first, again);
    assert_eq!(h.signer.signed.len(), 1);
}

#[test]
fn after_a_retry_the_game_goes_on_and_the_old_blob_is_a_replay_again() {
    let mut h = host(vec![Ok("Two.".into()), Ok("One.".into())], closed());
    let blob = open(&mut h);
    let first = parse_json(&say(&mut h, &blob, "hello there"));
    let retried = parse_json(&say(&mut h, &blob, "hello there"));
    assert_eq!(first, retried);
    let next_blob = retried["blob"].as_str().unwrap().to_string();
    let second = parse_json(&say(&mut h, &next_blob, "and another"));
    assert_eq!(second["used"], 2);
    // The stored reply is now the second turn's, so the first call no longer matches it.
    assert_eq!(parse_json(&say(&mut h, &blob, "hello there"))["error"], "replay");
}

#[test]
fn a_reply_that_cannot_be_stored_fails_the_turn_and_records_no_mark() {
    let mut h = host(vec![Ok("One.".into()), Ok("Two.".into())], closed());
    let blob = open(&mut h);
    h.budget.2 = true;
    let failed = parse_json(&say(&mut h, &blob, "hello there"));
    assert_eq!(failed["error"], "store");
    assert!(h.budget.0.is_empty());
    // With storage back, the same blob is a fresh turn, not a replay.
    h.budget.2 = false;
    let ok = parse_json(&say(&mut h, &blob, "hello there"));
    assert_eq!(ok["ok"], true, "{ok}");
    assert_eq!(h.model.calls, 2);
}

#[test]
fn a_stored_reply_belongs_to_one_player_and_round() {
    let mut h = host(vec![Ok("Evening.".into())], closed());
    let blob = open(&mut h);
    say(&mut h, &blob, "hello there");
    let keys: Vec<&String> = h.budget.1.keys().collect();
    assert_eq!(keys.len(), 1);
    assert_eq!(keys[0], "velvet-1|1|ada");
    // Someone else's blob, even with the same text, does not open ada's stored reply.
    let other = parse_json(&handle(
        &json!({"op": "say", "vault_id": "velvet-1", "round": 1, "player_id": "bea", "blob": blob, "text": "hello there"}).to_string(),
        &mut h,
    ));
    assert_eq!(other["error"], "bad blob");
}

#[test]
fn the_custom_path_retries_the_same_way() {
    use crate::tests::spec::{example, open_custom, seal};
    let mut h = host(vec![Ok("Evening.".into())], closed());
    let ct = seal(&mut h, &example());
    let blob = open_custom(&mut h, &ct)["blob"].as_str().unwrap().to_string();
    let body = |text: &str| json!({"op": "say", "vault_id": "velvet-1", "round": 1, "player_id": "ada", "blob": blob, "text": text, "spec_ct": ct}).to_string();
    let first = handle(&body("hello there"), &mut h);
    let again = handle(&body("hello there"), &mut h);
    assert_eq!(first, again);
    assert_eq!(h.model.calls, 1);
    let other: Value = parse_json(&handle(&body("another"), &mut h));
    assert_eq!(other["error"], "replay");
}
