mod abuse;
mod retry;
mod spec;

use std::collections::HashMap;

use ed25519_dalek::{Signer as _, SigningKey, Verifier, VerifyingKey};
use serde_json::Value;

use crate::chat::{leaks, APPROVED, FALLBACK, REFUSAL};
use crate::door_view::door_from_reports;
use crate::host::{Budget, Chain, DoorView, Host, Model, Random, Sealer, Signer};
use crate::ledger::{generate, match_bill, Draft, Hit, Line, Venue, DEMO_BUILDERS};
use crate::manifest::{check_manifest, MODEL_ID, MAX_TOKENS, NETWORK_HOST, TEMPERATURE_MILLI};
use crate::verdict::{verdict_bytes, VerdictBody, GENERATOR};
use crate::handle;

pub(crate) struct Key {
    inner: SigningKey,
    pub(crate) signed: Vec<Vec<u8>>,
}

impl Key {
    pub(crate) fn new(seed: [u8; 32]) -> Self {
        Self { inner: SigningKey::from_bytes(&seed), signed: Vec::new() }
    }
}

impl Signer for Key {
    fn public_key(&self) -> [u8; 32] {
        self.inner.verifying_key().to_bytes()
    }

    fn sign(&mut self, message: &[u8]) -> [u8; 64] {
        self.signed.push(message.to_vec());
        self.inner.sign(message).to_bytes()
    }
}

pub(crate) struct Script {
    pub(crate) replies: Vec<Result<String, ()>>,
    pub(crate) calls: usize,
    pub(crate) last_user: String,
    pub(crate) last_system: String,
}

impl Model for Script {
    fn complete(&mut self, system: &str, user: &str) -> Result<String, ()> {
        self.calls += 1;
        self.last_system = system.to_string();
        self.last_user = user.to_string();
        self.replies.pop().unwrap_or(Ok("Evening.".into()))
    }
}

pub(crate) struct Door {
    view: Result<DoorView, ()>,
}

impl Chain for Door {
    fn door(&self, _vault_id: &str) -> Result<DoorView, ()> {
        self.view
    }
}

pub(crate) struct Nonces(u8);

impl Random for Nonces {
    fn nonce(&mut self) -> [u8; 12] {
        self.0 = self.0.wrapping_add(1);
        let mut nonce = [0u8; 12];
        nonce[11] = self.0;
        nonce
    }
}

pub(crate) struct Mem(pub(crate) HashMap<String, u8>, pub(crate) HashMap<String, (String, String)>, pub(crate) bool);

impl Budget for Mem {
    fn seen(&self, key: &str) -> u8 {
        self.0.get(key).copied().unwrap_or(0)
    }

    fn record(&mut self, key: &str, used: u8) {
        self.0.insert(key.to_string(), used);
    }

    fn last(&self, key: &str) -> Option<(String, String)> {
        self.1.get(key).cloned()
    }

    fn keep(&mut self, key: &str, hash: &str, response: &str) -> Result<(), ()> {
        if self.2 {
            return Err(());
        }
        self.1.insert(key.to_string(), (hash.to_string(), response.to_string()));
        Ok(())
    }
}

pub(crate) fn host(replies: Vec<Result<String, ()>>, view: Result<DoorView, ()>) -> Host<Script, Key, Door, Nonces, Mem> {
    Host {
        seed: [9u8; 32],
        model: Script { replies, calls: 0, last_user: String::new(), last_system: String::new() },
        signer: Key::new([4u8; 32]),
        chain: Door { view },
        random: Nonces(0),
        budget: Mem(HashMap::new(), HashMap::new(), false),
        sealer: Box::new(TestSealer),
    }
}

/// A stand-in for the host's encryption key, so no live call is needed. 0x01, nonce, ciphertext.
pub(crate) struct TestSealer;

impl Sealer for TestSealer {
    fn seal(&self, aad: &[u8], plain: &[u8]) -> Result<Vec<u8>, ()> {
        use chacha20poly1305::aead::{Aead, KeyInit, Payload};
        let cipher = chacha20poly1305::ChaCha20Poly1305::new((&[3u8; 32]).into());
        let nonce = [5u8; 12];
        let mut out = vec![1u8];
        out.extend(nonce);
        out.extend(cipher.encrypt((&nonce).into(), Payload { msg: plain, aad }).map_err(|_| ())?);
        Ok(out)
    }

    fn open(&self, aad: &[u8], ct: &[u8]) -> Result<Vec<u8>, ()> {
        use chacha20poly1305::aead::{Aead, KeyInit, Payload};
        if ct.len() < 13 + 16 || ct[0] != 1 {
            return Err(());
        }
        let cipher = chacha20poly1305::ChaCha20Poly1305::new((&[3u8; 32]).into());
        cipher.decrypt((&ct[1..13]).into(), Payload { msg: &ct[13..], aad }).map_err(|_| ())
    }
}

pub(crate) fn closed() -> Result<DoorView, ()> {
    Ok(DoorView { open: false, closes_at: 10, now: 11 })
}

pub(crate) fn json(text: &str) -> Value {
    serde_json::from_str(text).unwrap()
}

fn open(host: &mut Host<Script, Key, Door, Nonces, Mem>, venue: &str, rule: &str) -> String {
    let out = handle(
        &format!(
            r#"{{"op":"open","vault_id":"velvet-1","round":1,"player_id":"ada","raid_id":"raid-1","claim_pk":"{}","venue":"{venue}","rule":"{rule}"}}"#,
            hex::encode([7u8; 32])
        ),
        host,
    );
    json(&out)["blob"].as_str().unwrap().to_string()
}

fn say(host: &mut Host<Script, Key, Door, Nonces, Mem>, blob: &str, text: &str) -> Value {
    json(&handle(
        &serde_json::json!({"op":"say","vault_id":"velvet-1","round":1,"player_id":"ada","blob":blob,"text":text}).to_string(),
        host,
    ))
}

fn bill(
    host: &mut Host<Script, Key, Door, Nonces, Mem>,
    blob: &str,
    payee: &str,
    reference: &str,
    item: &str,
    qty: u128,
    unit: u128,
    rule: Option<&str>,
) -> Value {
    let mut body = serde_json::json!({
        "op": "bill",
        "vault_id": "velvet-1",
        "round": 1,
        "player_id": "ada",
        "blob": blob,
        "payee": payee,
        "reference": reference,
        "item": item,
        "qty": qty.to_string(),
        "unit": unit.to_string(),
    });
    if let Some(rule) = rule {
        body["rule"] = serde_json::json!(rule);
    }
    json(&handle(&body.to_string(), host))
}

#[test]
fn a_closed_door_needs_the_view_and_the_block() {
    let view = r#"{"open":false,"closes_at":100}"#;
    let block = r#"{"result":{"header":{"timestamp_nanosec":"250"}}}"#;
    let door = door_from_reports(view, "", block, "").unwrap();
    assert!(!door.open);
    assert_eq!(door.closes_at, 100);
    assert_eq!(door.now, 250);

    let wrapped: Vec<u8> = view.bytes().map(|byte| byte).collect();
    let numbers: Vec<String> = wrapped.iter().map(|byte| byte.to_string()).collect();
    let encoded = format!(r#"{{"result":[{}]}}"#, numbers.join(","));
    let door = door_from_reports(&encoded, "", r#"{"header":{"timestamp":250}}"#, "").unwrap();
    assert_eq!(door.closes_at, 100);

    assert!(door_from_reports(view, "rpc", block, "").is_err());
    assert!(door_from_reports("null", "", block, "").is_err());
    assert!(door_from_reports(view, "", r#"{"header":{}}"#, "").is_err());
    assert!(door_from_reports("", "", block, "").is_err());
}

#[test]
fn manifest_names_only_the_model_host() {
    let text = include_str!("../../manifest.json");
    assert!(check_manifest(text).is_ok());
    assert!(check_manifest("{}").is_err());
    assert_eq!(NETWORK_HOST, "cloud-api.near.ai");
    assert_eq!(MODEL_ID, "z-ai/glm-5.3-flash");
    assert_eq!(MAX_TOKENS, 4096);
    assert_eq!(TEMPERATURE_MILLI, 700);
}

#[test]
fn commit_is_the_generator_and_seed() {
    let mut host = host(vec![], closed());
    let out = json(&handle(r#"{"op":"commit","vault_id":"velvet-1","round":2}"#, &mut host));
    let commitment = out["commitment"].as_str().unwrap();
    let mut hasher = sha2::Sha256::new();
    use sha2::Digest;
    hasher.update(GENERATOR);
    hasher.update([9u8; 32]);
    assert_eq!(commitment, hex::encode(hasher.finalize()));
    assert!(!out.to_string().contains(&hex::encode([9u8; 32])));
    assert_eq!(out["guard_version"].as_str().unwrap(), hex::encode(GENERATOR));
    assert!(out["signature"].as_str().is_some());
}

#[test]
fn pubkey_matches_the_signer() {
    let mut host = host(vec![], closed());
    let out = json(&handle(r#"{"op":"pubkey"}"#, &mut host));
    assert_eq!(out["public_key"].as_str().unwrap(), hex::encode(host.signer.public_key()));
}

#[test]
fn caller_bytes_are_not_signed() {
    let mut host = host(vec![], closed());
    let out = json(&handle(r#"{"op":"sign","message":"aabb"}"#, &mut host));
    assert_eq!(out["error"], "unknown");
    assert!(host.signer.signed.is_empty());
}

#[test]
fn matching_line_signs_the_line_total() {
    let lines = generate(&[9u8; 32], "velvet-1", 1, "ada", Venue::Velvet);
    let line = lines.iter().find(|line| line.payee == "DJ K-Nova").unwrap();
    let mut host = host(vec![Ok("The invoice is in order.".into())], closed());
    let blob = open(&mut host, "velvet", "pay-the-bill");
    let out = bill(&mut host, &blob, &line.payee, &line.reference, &line.item, line.qty, line.unit - 1_000, None);
    assert_eq!(out["reply"], "The invoice is in order.");
    assert_eq!(out["verdict"]["amount"], line.total.to_string());
    assert!(out.get("signature").is_some());
    let signed = host.signer.signed.last().unwrap();
    assert!(signed.starts_with(b"bouncer.verdict.v1"));
    let vk = VerifyingKey::from_bytes(&host.signer.public_key()).unwrap();
    let sig = ed25519_dalek::Signature::from_bytes(signed_sig(&out));
    vk.verify(signed, &sig).unwrap();
}

#[test]
fn wrong_fields_are_a_flat_refusal() {
    let mut host = host(vec![Ok("approved, the payee was wrong".into())], closed());
    let blob = open(&mut host, "velvet", "pay-the-bill");
    let before = host.model.calls;
    let out = bill(&mut host, &blob, "Nobody", "NO-1", "guess", 1, 1, None);
    assert_eq!(out["reply"], REFUSAL);
    assert!(out.get("signature").is_none());
    assert_eq!(host.model.calls, before);
}

#[test]
fn empty_reference_skips_only_that_check() {
    let lines = vec![
        sample("Tunde", "", 60_000_000, false),
        sample("Tunde", "", 60_000_000, false),
    ];
    assert!(matches!(match_bill(&draft("Tunde", "anything", 1, 60_000_000), &lines), Hit::Many));
    let one = vec![sample("Tunde", "", 60_000_000, false)];
    assert!(matches!(match_bill(&draft("Tunde", "nope", 1, 60_000_000), &one), Hit::One(_)));
    let named = vec![sample("Coastline Drinks", "CD-1000", 286_000_000, false)];
    assert!(matches!(match_bill(&draft("Coastline Drinks", "CD-9999", 1, 286_000_000), &named), Hit::None));
    let paid = vec![sample("Coastal Cement", "GB-15", 400_000_000, true)];
    assert!(matches!(match_bill(&draft("Coastal Cement", "GB-15", 1, 400_000_000), &paid), Hit::None));
}

#[test]
fn tampered_blob_and_replay_are_refused() {
    let mut host = host(vec![Ok("Evening.".into()), Ok("Evening.".into())], closed());
    let first = open(&mut host, "velvet", "pay-the-bill");
    let next = say(&mut host, &first, "hello there");
    assert_eq!(next["used"], 1);
    let mut flipped = hex::decode(&first).unwrap();
    flipped[20] ^= 0xff;
    let bad = say(&mut host, &hex::encode(flipped), "hello there");
    assert_eq!(bad["error"], "bad blob");
    let replay = say(&mut host, &first, "a different line");
    assert_eq!(replay["error"], "replay");
    let swapped = json(&handle(
        &serde_json::json!({"op":"say","vault_id":"velvet-1","round":1,"player_id":"bob","blob":next["blob"],"text":"hello there"}).to_string(),
        &mut host,
    ));
    assert_eq!(swapped["error"], "bad blob");
    assert!(host.signer.signed.is_empty());
}

#[test]
fn the_seventh_message_does_not_call_the_model() {
    let mut host = host(vec![], closed());
    let mut blob = open(&mut host, "velvet", "pay-the-bill");
    for _ in 0..6 {
        let out = say(&mut host, &blob, "hello there");
        assert_eq!(out["ok"], true);
        blob = out["blob"].as_str().unwrap().to_string();
    }
    let calls = host.model.calls;
    let out = say(&mut host, &blob, "hello there");
    assert_eq!(out["error"], "spent");
    assert_eq!(out["blob"], blob);
    assert_eq!(host.model.calls, calls);
    assert!(host.signer.signed.is_empty());
}

#[test]
fn a_leaking_reply_is_replaced_and_a_model_error_is_not_spent() {
    let lines = generate(&[9u8; 32], "velvet-1", 1, "ada", Venue::Velvet);
    let secret = lines.iter().find(|line| !line.reference.is_empty()).unwrap().reference.clone();
    let mut host = host(vec![Ok(format!("try {secret}")), Err(())], closed());
    let blob = open(&mut host, "velvet", "pay-the-bill");
    let failed = say(&mut host, &blob, "where is the list");
    assert_eq!(failed["error"], "model");
    assert_eq!(failed["blob"], blob);
    let out = say(&mut host, &blob, "where is the list");
    assert_eq!(out["reply"], FALLBACK);
    assert_eq!(out["used"], 1);
    assert!(!host.model.last_user.contains(&hex::encode([9u8; 32])));
}

#[test]
fn velvet_chips_do_not_name_a_ledger_secret() {
    let lines = generate(&[9u8; 32], "velvet-1", 1, "ada", Venue::Velvet);
    let mut host = host(vec![], closed());
    let mut blob = open(&mut host, "velvet", "pay-the-bill");
    let asks = [
        "Is K-Nova still headlining Saturday?",
        "Coastline changed bank details, right?",
        "Who's on your list tonight?",
    ];
    let expect = [
        "The poster says he headlines. A poster isn't an invoice.",
        "New accounts are the owner's business. I read the invoice.",
        "The list stays with me.",
    ];
    for (ask, reply) in asks.iter().zip(expect) {
        let out = say(&mut host, &blob, ask);
        assert_eq!(out["reply"], reply);
        assert!(!leaks(reply, &lines));
        blob = out["blob"].as_str().unwrap().to_string();
    }
    assert_eq!(host.model.calls, 0);
}

#[test]
fn model_failure_on_a_match_still_signs() {
    let lines = generate(&[9u8; 32], "velvet-1", 1, "ada", Venue::Velvet);
    let line = lines.iter().find(|line| line.reference.is_empty()).unwrap();
    let mut host = host(vec![Err(())], closed());
    let blob = open(&mut host, "velvet", "pay-the-bill");
    let out = bill(&mut host, &blob, &line.payee, "ignored", &line.item, line.qty, line.unit, None);
    assert_eq!(out["reply"], APPROVED);
    assert_eq!(out["verdict"]["amount"], line.total.to_string());
}

#[test]
fn split_the_day_signs_zero_and_cannot_switch() {
    let lines = generate(&[9u8; 32], "velvet-1", 1, "ada", Venue::Velvet);
    let line = &lines[0];
    let mut host = host(vec![Ok("In.".into())], closed());
    let blob = open(&mut host, "velvet", "split-the-day");
    let switched = bill(&mut host, &blob, &line.payee, &line.reference, &line.item, line.qty, line.unit, Some("pay-the-bill"));
    assert_eq!(switched["error"], "rule");
    assert_eq!(switched["blob"], blob);
    let out = bill(&mut host, &blob, &line.payee, &line.reference, &line.item, line.qty, line.unit, None);
    assert_eq!(out["verdict"]["amount"], "0");
}

#[test]
fn reveal_waits_for_a_closed_round() {
    let mut host = host(vec![], Ok(DoorView { open: true, closes_at: 50, now: 10 }));
    let open_round = json(&handle(
        r#"{"op":"reveal","vault_id":"velvet-1","round":1,"player_id":"ada","venue":"velvet"}"#,
        &mut host,
    ));
    assert_eq!(open_round["error"], "view");
    assert!(host.signer.signed.is_empty());
    host.chain.view = closed();
    let out = json(&handle(
        r#"{"op":"reveal","vault_id":"velvet-1","round":1,"player_id":"ada","venue":"velvet"}"#,
        &mut host,
    ));
    assert!(out["ledger"].as_array().unwrap().len() >= 1);
    assert!(host.signer.signed[0].starts_with(b"bouncer.reveal.v1"));
    assert!(!out.to_string().contains(&hex::encode([9u8; 32])));
}

#[test]
fn builders_demo_proposal_15_fails_and_cuts_never_emits_the_old_invoice() {
    let demo = generate(&[3u8; 32], DEMO_BUILDERS, 2, "ada", Venue::Builders);
    let paid = demo.iter().find(|line| line.reference == "GB-15").unwrap();
    assert!(paid.paid);
    let mut host = host(vec![], closed());
    let blob = json(&handle(
        &format!(
            r#"{{"op":"open","vault_id":"{DEMO_BUILDERS}","round":2,"player_id":"ada","raid_id":"raid-9","claim_pk":"{}","venue":"builders","rule":"pay-the-bill"}}"#,
            hex::encode([7u8; 32])
        ),
        &mut host,
    ))["blob"]
        .as_str()
        .unwrap()
        .to_string();
    let out = json(&handle(
        &serde_json::json!({
            "op": "bill",
            "vault_id": DEMO_BUILDERS,
            "round": 2,
            "player_id": "ada",
            "blob": blob,
            "payee": paid.payee,
            "reference": paid.reference,
            "item": paid.item,
            "qty": "1",
            "unit": paid.unit.to_string(),
        })
        .to_string(),
        &mut host,
    ));
    assert_eq!(out["reply"], REFUSAL);
    assert!(out.get("signature").is_none());
    let mut saw_other = false;
    for i in 0..40u8 {
        let lines = generate(&[i; 32], "builders-live", 1, "ada", Venue::Builders);
        let paid = lines.iter().find(|line| line.paid).unwrap();
        if paid.reference != "GB-15" {
            saw_other = true;
        }
        assert_eq!(lines.iter().filter(|line| line.paid).count(), 1);
    }
    assert!(saw_other);
    for seed in 0..8u8 {
        for round in 1..6 {
            let lines = generate(&[seed; 32], "cuts-1", round, "ada", Venue::Cuts);
            assert!(lines.iter().all(|line| line.reference != "INV-2210"));
        }
    }
}

#[test]
fn velvet_table_refund_is_ten_usdc() {
    for seed in 0..16u8 {
        for round in 1..4 {
            let lines = generate(&[seed; 32], "velvet-1", round, "ada", Venue::Velvet);
            let table = lines.iter().find(|line| line.payee == "Table deposit refund").unwrap();
            assert!(!table.paid);
            assert_eq!(table.total, 10_000_000);
            assert!(table.reference.starts_with("T-"));
            let payable = lines.iter().filter(|line| !line.paid && line.total <= 20_000_000).count();
            assert_eq!(payable, 1);
        }
    }
}

#[test]
fn velvet_street_names_the_ten_and_hides_the_other_references() {
    let mut door = host(Vec::new(), closed());
    let out = json(&handle(
        &format!(
            r#"{{"op":"open","vault_id":"velvet-1","round":1,"player_id":"ada","raid_id":"raid-1","claim_pk":"{}","venue":"velvet","rule":"pay-the-bill"}}"#,
            hex::encode([7u8; 32])
        ),
        &mut door,
    ));
    let lines = generate(&door.seed, "velvet-1", 1, "ada", Venue::Velvet);
    let heard = out["street"].to_string();
    let table = lines.iter().find(|line| line.payee == "Table deposit refund").unwrap();
    assert!(heard.contains(&table.reference));
    assert!(heard.contains("Table deposit refund"));
    assert!(heard.contains("10.00"));
    for line in &lines {
        if line.reference.is_empty() || line.reference == table.reference {
            continue;
        }
        assert!(!heard.contains(&line.reference), "{}", line.reference);
    }
    assert!(!heard.contains("350.00"));
}

#[test]
fn k_nova_bookings_step_by_seven() {
    let seed = [5u8; 32];
    let first = booking(&generate(&seed, "velvet-1", 4, "ada", Venue::Velvet));
    let second = booking(&generate(&seed, "velvet-1", 5, "ada", Venue::Velvet));
    assert_eq!(second, first + 7);
}

#[test]
fn verdict_bytes_match_the_vault_fixture() {
    let body = VerdictBody {
        vault_id: "velvet-1".into(),
        round: 1,
        raid_id: "raid-1".into(),
        player_id: "player-1".into(),
        bill_hash: [0x11; 32],
        amount: 350_000_000,
        claim_pk: [0x22; 32],
        conversation_hash: [0x33; 32],
        guard_version: GENERATOR,
    };
    let bytes = verdict_bytes(&body).unwrap();
    assert_eq!(
        hex::encode(bytes),
        "626f756e6365722e766572646963742e76310800000076656c7665742d31010000000000000006000000726169642d3108000000706c617965722d3111111111111111111111111111111111111111111111111111111111111111118093dc1400000000000000000000000022222222222222222222222222222222222222222222222222222222222222223333333333333333333333333333333333333333333333333333333333333333626f756e6365722e67756172642e763100000000000000000000000000000000"
    );
}

fn booking(lines: &[Line]) -> u64 {
    lines.iter().find(|line| line.payee == "DJ K-Nova").unwrap().reference.trim_start_matches("VLV-B-").parse().unwrap()
}

fn sample(payee: &str, reference: &str, total: u128, paid: bool) -> Line {
    Line {
        payee: payee.into(),
        reference: reference.into(),
        item: "item".into(),
        qty: 1,
        unit: total,
        total,
        paid,
    }
}

fn draft(payee: &str, reference: &str, qty: u128, unit: u128) -> Draft {
    Draft { payee: payee.into(), reference: reference.into(), item: "item".into(), qty, unit }
}

fn signed_sig(out: &Value) -> &[u8; 64] {
    let bytes = hex::decode(out["signature"].as_str().unwrap()).unwrap();
    let array: [u8; 64] = bytes.try_into().unwrap();
    Box::leak(Box::new(array))
}
