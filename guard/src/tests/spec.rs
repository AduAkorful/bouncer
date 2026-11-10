use ed25519_dalek::{Verifier, VerifyingKey};
use serde_json::{json, Value};

use crate::host::{DoorView, Host, Signer};
use crate::ledger::match_bill_with;
use crate::spec::parse;
use crate::spec_ledger::{generate_spec, spec_commitment, spec_guard_version};
use crate::tests::{closed, host, json as parse_json, Door, Key, Mem, Nonces, Script};
use crate::verdict::{commit_bytes, reveal_bytes, VERDICT_DOMAIN};
use crate::{check_manifest, handle, GENERATOR};

type H = Host<Script, Key, Door, Nonces, Mem>;

pub(crate) fn example() -> Value {
    json!({
        "v": 1,
        "salt": "00112233445566778899aabbccddeeff",
        "decimals": 6,
        "guard": {"voice": "Dry, tired, polite. Ends every sentence flat."},
        "lines": [
            {"payee": "DJ K-Nova", "reference": "VLV-B-{d3}", "item": "Saturday set", "qty": {"lo": 1, "hi": 1}, "unit": {"lo": "300", "hi": "400"}, "paid": false},
            {"payee": "Golden Hour Promotions", "reference": "GH-{d4}", "item": "door share", "qty": {"lo": 1, "hi": 1}, "unit": {"lo": "100", "hi": "200"}, "paid": false},
            {"payee": "Tunde Adeyemi", "reference": "", "item": "security shifts", "qty": {"lo": 1, "hi": 3}, "unit": {"lo": "60", "hi": "60"}, "paid": true},
            {"payee": "Coastline Drinks", "reference": "CD-{d4}", "item": "bar delivery", "qty": {"lo": 1, "hi": 1}, "unit": {"lo": "90.50", "hi": "120"}, "paid": false}
        ],
        "chips": [{"ask": "Who is on the list?", "reply": "The list stays with me."}],
        "hint": "I heard {payee} is still waiting on money from tonight."
    })
}

fn send(host: &mut H, body: Value) -> Value {
    parse_json(&handle(&body.to_string(), host))
}

pub(crate) fn seal(host: &mut H, spec: &Value) -> String {
    let out = send(host, json!({"op": "seal_spec", "vault_id": "velvet-1", "spec": spec, "cap": (500u128 * 10u128.pow(spec["decimals"].as_u64().unwrap() as u32)).to_string(), "ack_hint": true}));
    assert_eq!(out["ok"], true, "{out}");
    out["spec_ct"].as_str().unwrap().to_string()
}

pub(crate) fn open_custom(host: &mut H, ct: &str) -> Value {
    send(
        host,
        json!({"op": "open", "vault_id": "velvet-1", "round": 1, "player_id": "ada", "raid_id": "raid-1",
            "claim_pk": hex::encode([7u8; 32]), "venue": "custom", "rule": "pay-the-bill", "spec_ct": ct}),
    )
}

fn say(host: &mut H, blob: &str, ct: Option<&str>, text: &str) -> Value {
    let mut body = json!({"op": "say", "vault_id": "velvet-1", "round": 1, "player_id": "ada", "blob": blob, "text": text});
    if let Some(ct) = ct {
        body["spec_ct"] = json!(ct);
    }
    send(host, body)
}

fn ledger(spec: &Value) -> Vec<crate::ledger::Line> {
    let text = serde_json::to_string(spec).unwrap();
    let parsed = parse(&text).unwrap();
    let hash = sha(&text);
    generate_spec(&parsed, &[9u8; 32], &hash, "velvet-1", 1, "ada")
}

fn sha(text: &str) -> [u8; 32] {
    use sha2::{Digest, Sha256};
    Sha256::digest(text.as_bytes()).into()
}

fn bill_of(line: &crate::ledger::Line) -> Value {
    json!({"payee": line.payee, "reference": line.reference, "item": line.item,
        "qty": line.qty.to_string(), "unit": line.unit.to_string()})
}

fn send_bill(host: &mut H, blob: &str, ct: &str, line: &crate::ledger::Line, amount_off: u128) -> Value {
    let mut body = json!({"op": "bill", "vault_id": "velvet-1", "round": 1, "player_id": "ada", "blob": blob, "spec_ct": ct});
    let mut fields = bill_of(line);
    fields["unit"] = json!((line.unit + amount_off).to_string());
    for (k, v) in fields.as_object().unwrap() {
        body[k] = v.clone();
    }
    send(host, body)
}

fn spec_err(spec: Value) -> String {
    parse(&serde_json::to_string(&spec).unwrap()).unwrap_err()
}

#[test]
fn the_example_parses() {
    assert!(parse(&serde_json::to_string(&example()).unwrap()).is_ok());
}

#[test]
fn the_parser_refuses_what_the_limits_forbid() {
    let mut s = example();
    s["extra"] = json!(1);
    assert!(spec_err(s).contains("Unknown field extra"));
    let mut s = example();
    s["decimals"] = json!(1);
    assert!(spec_err(s).contains("Decimals"));
    let mut s = example();
    s["decimals"] = json!(19);
    assert!(spec_err(s).contains("Decimals"));
    let mut s = example();
    s["lines"][0]["unit"]["lo"] = json!("1.234");
    assert!(spec_err(s).contains("two decimals"));
    let mut s = example();
    s["lines"][0]["reference"] = json!("A-{x}");
    assert!(spec_err(s).contains("Unknown reference token"));
    let mut s = example();
    s["salt"] = json!("abc");
    assert!(spec_err(s).contains("salt"));
    let mut s = example();
    let line = s["lines"][0].clone();
    s["lines"] = json!(vec![line; 13]);
    assert!(spec_err(s).contains("1 to 12"));
    let mut s = example();
    s["lines"][0]["paid"] = json!("no");
    assert!(spec_err(s).contains("paid"));
    let mut s = example();
    s["hint"] = json!("Pay {everyone}.");
    assert!(spec_err(s).contains("Unknown hint token"));
    let mut s = example();
    s["guard"]["voice"] = json!("x".repeat(601));
    assert!(spec_err(s).contains("600"));
    let mut s = example();
    s["chips"] = json!(vec![json!({"ask": "a", "reply": "r".repeat(400)}); 6]);
    assert!(spec_err(s).contains("together"));
    assert!(parse(&"x".repeat(9000)).unwrap_err().contains("larger"));
}

#[test]
fn a_ledger_is_deterministic_and_varies_by_round_player_spec_and_vault() {
    let spec = example();
    let a = ledger(&spec);
    assert_eq!(a, ledger(&spec));
    let text = serde_json::to_string(&spec).unwrap();
    let parsed = parse(&text).unwrap();
    let hash = sha(&text);
    let other = |vault: &str, round: u64, player: &str, hash: &[u8; 32]| generate_spec(&parsed, &[9u8; 32], hash, vault, round, player);
    assert_ne!(a, other("velvet-1", 2, "ada", &hash));
    assert_ne!(a, other("velvet-1", 1, "bea", &hash));
    assert_ne!(a, other("other-vault", 1, "ada", &hash));
    assert_ne!(a, other("velvet-1", 1, "ada", &[1u8; 32]));
    assert_eq!(a.len(), 4);
    assert!(a[2].paid && !a[0].paid);
    assert!(a[0].reference.starts_with("VLV-B-") && a[0].reference.len() == 9);
    assert!(a[2].reference.is_empty());
    assert!(a[0].total >= 300_000_000 && a[0].total <= 400_000_000);
    assert_eq!(a[3].total % 10_000, 0);
}

#[test]
fn the_built_in_ledger_is_unchanged() {
    let lines = crate::generate(&[9u8; 32], "velvet-1", 1, "ada", crate::Venue::Velvet);
    let hash = hex::encode(crate::verdict::ledger_hash(&lines).unwrap());
    assert_eq!(hash, include_str!("../../fixtures/velvet-9-ada-1.hash").trim());
}

#[test]
fn sealing_round_trips_and_binds_the_vault() {
    let mut h = host(vec![], closed());
    let ct = seal(&mut h, &example());
    let opened = open_custom(&mut h, &ct);
    assert_eq!(opened["ok"], true, "{opened}");
    assert!(opened["blob"].as_str().is_some());
    let mut flipped = hex::decode(&ct).unwrap();
    let last = flipped.len() - 1;
    flipped[last] ^= 1;
    assert_eq!(open_custom(&mut h, &hex::encode(flipped))["error"], "bad spec");
    let moved = send(
        &mut h,
        json!({"op": "open", "vault_id": "other-vault", "round": 1, "player_id": "ada", "raid_id": "raid-1",
            "claim_pk": hex::encode([7u8; 32]), "venue": "custom", "rule": "pay-the-bill", "spec_ct": ct}),
    );
    assert_eq!(moved["error"], "bad spec");
    let bad = send(&mut h, json!({"op": "seal_spec", "vault_id": "velvet-1", "spec": {"v": 1}, "cap": "500000000", "ack_hint": true}));
    assert_eq!(bad["error"], "spec");
}

#[test]
fn open_returns_payees_and_a_filled_hint_and_never_a_ledger() {
    let mut h = host(vec![], closed());
    let ct = seal(&mut h, &example());
    let out = open_custom(&mut h, &ct);
    let street = &out["street"];
    assert_eq!(street["payees"].as_array().unwrap().len(), 4);
    let text = street["queue"][0]["lines"][0]["text"].as_str().unwrap();
    assert!(text.starts_with("I heard "), "{text}");
    assert!(street["poster"].as_array().unwrap().is_empty());
    assert!(!out.to_string().contains("Saturday set"));
}

fn check(spec: &Value, cap: &str) -> Value {
    let mut h = host(vec![], closed());
    send(&mut h, json!({"op": "check_spec", "spec": spec, "cap": cap}))
}

fn failed(out: &Value, needle: &str) -> bool {
    out["failures"].as_array().unwrap().iter().any(|f| f.as_str().unwrap().contains(needle))
}

#[test]
fn the_fairness_test_passes_the_example() {
    let out = check(&example(), "500000000");
    assert_eq!(out["pass"], true, "{out}");
    assert!(out["warnings"].as_array().unwrap().is_empty());
}

#[test]
fn the_fairness_test_fails_each_check() {
    let out = check(&example(), "250000000");
    assert_eq!(out["pass"], false);
    assert!(failed(&out, "above the cap"));

    let mut s = example();
    s["lines"][1]["payee"] = json!("Golden Hour");
    s["lines"][0]["payee"] = json!("Golden Hour Ltd");
    s["lines"][0]["reference"] = json!("");
    s["lines"][1]["reference"] = json!("");
    s["lines"][0]["unit"] = json!({"lo": "150", "hi": "150"});
    s["lines"][1]["unit"] = json!({"lo": "150", "hi": "150"});
    assert!(failed(&check(&s, "500000000"), "also matches another line"));

    let mut s = example();
    s["lines"][0]["reference"] = json!("A-{n:1-5}");
    assert!(failed(&check(&s, "500000000"), "fewer than 100 values"));

    let mut s = example();
    s["lines"][0]["payee"] = json!("Al");
    assert!(failed(&check(&s, "500000000"), "at least 4"));

    let mut s = example();
    s["lines"][1]["reference"] = json!("DUP-1");
    s["lines"][3]["reference"] = json!("DUP-1");
    s["lines"][1]["unit"] = json!({"lo": "100", "hi": "100"});
    s["lines"][3]["unit"] = json!({"lo": "100", "hi": "100"});
    assert!(failed(&check(&s, "500000000"), "same reference"));

    let mut s = example();
    s["chips"] = json!([{"ask": "Who?", "reply": "Tunde Adeyemi is paid."}]);
    assert!(failed(&check(&s, "500000000"), "repeats a ledger"));

    let mut s = example();
    for line in s["lines"].as_array_mut().unwrap() {
        line["paid"] = json!(true);
    }
    assert!(failed(&check(&s, "500000000"), "no bill the pot can pay"));

    let mut s = example();
    s["lines"][2]["paid"] = json!(false);
    s["lines"][2]["unit"] = json!({"lo": "0", "hi": "0"});
    assert!(failed(&check(&s, "500000000"), "zero amount"));
}

#[test]
fn no_paid_line_and_no_hint_are_warnings_not_failures() {
    let mut s = example();
    s["lines"][2]["paid"] = json!(false);
    s["lines"][2]["reference"] = json!("TS-{d4}");
    s["lines"][2]["unit"] = json!({"lo": "30", "hi": "60"});
    s.as_object_mut().unwrap().remove("hint");
    let out = check(&s, "500000000");
    assert_eq!(out["pass"], true, "{out}");
    assert_eq!(out["warnings"].as_array().unwrap().len(), 2);
}

#[test]
fn commit_is_signed_under_its_own_domain() {
    let mut h = host(vec![], closed());
    let ct = seal(&mut h, &example());
    let out = send(&mut h, json!({"op": "commit", "vault_id": "velvet-1", "round": 2, "spec_ct": ct}));
    assert_eq!(out["ok"], true, "{out}");
    let hash = sha(&serde_json::to_string(&example()).unwrap());
    let commitment = spec_commitment(&GENERATOR, &[9u8; 32], &hash);
    let version = spec_guard_version(&GENERATOR, &hash);
    assert_eq!(out["commitment"], hex::encode(commitment));
    assert_eq!(out["guard_version"], hex::encode(version));
    let sig: [u8; 64] = hex::decode(out["signature"].as_str().unwrap()).unwrap().try_into().unwrap();
    let key = VerifyingKey::from_bytes(&h.signer.public_key()).unwrap();
    let message = commit_bytes("velvet-1", 2, commitment, version).unwrap();
    assert!(key.verify(&message, &sig.into()).is_ok());
    let mut as_verdict = VERDICT_DOMAIN.to_vec();
    as_verdict.extend(&message[b"bouncer.commit.v1".len()..]);
    assert!(key.verify(&as_verdict, &sig.into()).is_err());
    let other = commit_bytes("velvet-1", 3, commitment, version).unwrap();
    assert!(key.verify(&other, &sig.into()).is_err());
}

#[test]
fn commit_bytes_match_the_fixture_for_the_vault() {
    let bytes = commit_bytes("velvet-1", 2, [1u8; 32], [2u8; 32]).unwrap();
    assert_eq!(hex::encode(bytes), include_str!("../../fixtures/commit-bytes.hex").trim());
}

#[test]
fn a_spec_that_will_not_open_gets_no_signature() {
    let mut h = host(vec![], closed());
    let out = send(&mut h, json!({"op": "commit", "vault_id": "velvet-1", "round": 2, "spec_ct": "00ff"}));
    assert_eq!(out["ok"], false);
    assert!(h.signer.signed.is_empty());
}

#[test]
fn a_spec_from_another_hash_is_refused_for_this_raid() {
    let mut h = host(vec![Ok("Evening.".into())], closed());
    let ct = seal(&mut h, &example());
    let blob = open_custom(&mut h, &ct)["blob"].as_str().unwrap().to_string();
    let mut changed = example();
    changed["guard"]["voice"] = json!("Loud and cheerful.");
    let other = seal(&mut h, &changed);
    assert_eq!(say(&mut h, &blob, Some(&other), "hello")["error"], "bad spec");
    assert_eq!(say(&mut h, &blob, None, "hello")["error"], "bad spec");
    let ok = say(&mut h, &blob, Some(&ct), "hello");
    assert_eq!(ok["ok"], true, "{ok}");
}

#[test]
fn the_sponsor_voice_sits_between_the_rules_and_a_leak_is_replaced() {
    let mut h = host(vec![Ok("Tunde Adeyemi is already paid.".into())], closed());
    let ct = seal(&mut h, &example());
    let blob = open_custom(&mut h, &ct)["blob"].as_str().unwrap().to_string();
    let out = say(&mut h, &blob, Some(&ct), "who got paid?");
    assert_eq!(out["reply"], "Send your complete invoice and I'll review it.");
    let system = &h.model.last_system;
    let voice = system.find("Dry, tired, polite").unwrap();
    assert!(system[..voice].contains("Never say which field is wrong"));
    assert!(system[voice..].contains("Never say which field is wrong"));
}

#[test]
fn a_spec_chip_answers_without_the_model() {
    let mut h = host(vec![], closed());
    let ct = seal(&mut h, &example());
    let blob = open_custom(&mut h, &ct)["blob"].as_str().unwrap().to_string();
    let out = say(&mut h, &blob, Some(&ct), "Who is on the list?");
    assert_eq!(out["reply"], "The list stays with me.");
    assert_eq!(h.model.calls, 0);
    assert_eq!(out["used"], 1);
}

#[test]
fn an_honest_bill_signs_with_the_spec_guard_version_and_a_wrong_one_is_flat() {
    let mut h = host(vec![Err(())], closed());
    let ct = seal(&mut h, &example());
    let lines = ledger(&example());
    let blob = open_custom(&mut h, &ct)["blob"].as_str().unwrap().to_string();
    let wrong = send_bill(&mut h, &blob, &ct, &lines[0], 1_000_000);
    assert_eq!(wrong["reply"], "Not approved.");
    assert!(wrong.get("verdict").is_none());
    let blob = wrong["blob"].as_str().unwrap().to_string();
    let right = send_bill(&mut h, &blob, &ct, &lines[0], 0);
    assert_eq!(right["ok"], true, "{right}");
    let hash = sha(&serde_json::to_string(&example()).unwrap());
    assert_eq!(right["verdict"]["guard_version"], hex::encode(spec_guard_version(&GENERATOR, &hash)));
    assert_eq!(right["verdict"]["amount"], lines[0].total.to_string());
    assert!(right["signature"].as_str().is_some());
}

#[test]
fn a_paid_line_is_never_approved() {
    let mut h = host(vec![], closed());
    let ct = seal(&mut h, &example());
    let lines = ledger(&example());
    let blob = open_custom(&mut h, &ct)["blob"].as_str().unwrap().to_string();
    let out = send_bill(&mut h, &blob, &ct, &lines[2], 0);
    assert_eq!(out["reply"], "Not approved.");
}

#[test]
fn other_decimals_scale_amounts_and_the_slack() {
    let mut s = example();
    s["decimals"] = json!(8);
    let mut h = host(vec![Err(())], closed());
    let ct = seal(&mut h, &s);
    let lines = ledger(&s);
    assert_eq!(lines[0].total % 1_000_000, 0);
    assert!(lines[0].total >= 30_000_000_000);
    let blob = open_custom(&mut h, &ct)["blob"].as_str().unwrap().to_string();
    let out = send_bill(&mut h, &blob, &ct, &lines[0], 0);
    assert_eq!(out["ok"], true, "{out}");
    let text = serde_json::to_string(&s).unwrap();
    let parsed = parse(&text).unwrap();
    let honest = crate::Draft { payee: lines[0].payee.clone(), reference: lines[0].reference.clone(), item: lines[0].item.clone(), qty: lines[0].qty, unit: lines[0].unit };
    assert!(matches!(match_bill_with(&honest, &lines, crate::ledger::tolerance(parsed.decimals)), crate::Hit::One(_)));
    assert_eq!(crate::ledger::tolerance(2), 0);
    assert_eq!(crate::ledger::tolerance(6), 5_000);
}

#[test]
fn reveal_gives_the_custom_ledger_and_its_commitment() {
    let mut h = host(vec![], Ok(DoorView { open: false, closes_at: 10, now: 11 }));
    let ct = seal(&mut h, &example());
    let out = send(
        &mut h,
        json!({"op": "reveal", "vault_id": "velvet-1", "round": 1, "player_id": "ada", "venue": "custom", "spec_ct": ct}),
    );
    assert_eq!(out["ok"], true, "{out}");
    let lines = ledger(&example());
    assert_eq!(out["ledger"][0]["payee"], lines[0].payee);
    assert_eq!(out["ledger"][0]["total"], lines[0].total.to_string());
    let hash = sha(&serde_json::to_string(&example()).unwrap());
    let commitment = spec_commitment(&GENERATOR, &[9u8; 32], &hash);
    assert_eq!(out["commitment"], hex::encode(commitment));
    let ledger_hash = crate::verdict::ledger_hash(&lines).unwrap();
    let message = reveal_bytes("velvet-1", 1, "ada", ledger_hash, commitment).unwrap();
    let sig: [u8; 64] = hex::decode(out["signature"].as_str().unwrap()).unwrap().try_into().unwrap();
    let key = VerifyingKey::from_bytes(&h.signer.public_key()).unwrap();
    assert!(key.verify(&message, &sig.into()).is_ok());
}

fn draft(reply: Result<String, ()>) -> Value {
    let mut h = host(vec![reply], closed());
    send(&mut h, json!({"op": "draft_spec", "story": "A small club that owes DJs and bar suppliers.", "decimals": 6}))
}

#[test]
fn a_draft_is_parsed_strictly_and_given_a_salt_and_decimals() {
    let mut model = example();
    let object = model.as_object_mut().unwrap();
    object.remove("salt");
    object.remove("decimals");
    object.remove("v");
    let wrapped = format!("Here you go:\n```json\n{model}\n```");
    let out = draft(Ok(wrapped));
    assert_eq!(out["ok"], true, "{out}");
    assert_eq!(out["spec"]["salt"].as_str().unwrap().len(), 32);
    assert_eq!(out["spec"]["decimals"], 6);
    let mut h = host(vec![], closed());
    let sealed = send(&mut h, json!({"op": "seal_spec", "vault_id": "v", "spec": out["spec"], "cap": "500000000", "ack_hint": true}));
    assert_eq!(sealed["ok"], true, "{sealed}");
}

#[test]
fn a_draft_that_is_not_a_spec_is_an_error() {
    assert_eq!(draft(Ok("I cannot do that.".into()))["error"], "spec");
    assert_eq!(draft(Ok(r#"{"lines": []}"#.into()))["error"], "spec");
    let failed = draft(Err(()));
    assert_eq!(failed["error"], "model");
    assert_eq!(failed["stage"], "model:unknown");
    let mut h = host(vec![], closed());
    assert_eq!(send(&mut h, json!({"op": "draft_spec", "story": "", "decimals": 6}))["error"], "bad story");
    assert_eq!(send(&mut h, json!({"op": "draft_spec", "story": "x", "decimals": 1}))["error"], "bad decimals");
}

#[test]
fn the_manifest_must_declare_exactly_the_spec_key() {
    let text = include_str!("../../manifest.json");
    assert!(check_manifest(text).is_ok());
    let mut v: Value = serde_json::from_str(text).unwrap();
    v.as_object_mut().unwrap().remove("encryption_keys");
    assert!(check_manifest(&v.to_string()).is_err());
    let mut v: Value = serde_json::from_str(text).unwrap();
    v["encryption_keys"] = json!([{"path": "spec"}, {"path": "other"}]);
    assert!(check_manifest(&v.to_string()).is_err());
    let mut v: Value = serde_json::from_str(text).unwrap();
    v["encryption_keys"] = json!([{"path": "spec", "bind": "wasm"}]);
    assert!(check_manifest(&v.to_string()).is_err());
}

#[test]
fn the_spec_guard_version_is_pinned_for_the_vault() {
    assert_eq!(
        hex::encode(spec_guard_version(&GENERATOR, &[1u8; 32])),
        "e5c6d557967eac9c8244e54c495e25acf486289322d8a3ec95c5cce442a06eaf"
    );
}

#[test]
fn draft_exposes_only_the_fixed_model_stage() {
    struct Failed;
    impl crate::host::Model for Failed {
        fn complete(&mut self, _: &str, _: &str) -> Result<String, ()> { Err(()) }
        fn complete_draft(&mut self, _: &str, _: &str) -> Result<String, crate::model_diagnostic::ModelFailure> {
            Err(crate::model_diagnostic::ModelFailure::EmptyContent)
        }
    }
    let h = host(vec![], closed());
    let mut h = crate::host::Host { seed: h.seed, model: Failed, signer: h.signer, chain: h.chain, random: h.random, budget: h.budget, sealer: h.sealer };
    let response: Value = serde_json::from_str(&crate::handle(&json!({"op":"draft_spec","story":"private story","decimals":6}).to_string(), &mut h)).unwrap();
    assert_eq!(response, json!({"ok": false, "error": "model", "stage": "model:empty_content"}));
}

fn open_as(host: &mut H, ct: &str, player: &str) -> Value {
    send(
        host,
        json!({"op": "open", "vault_id": "velvet-1", "round": 1, "player_id": player, "raid_id": "raid-1",
            "claim_pk": hex::encode([7u8; 32]), "venue": "custom", "rule": "pay-the-bill", "spec_ct": ct}),
    )
}

#[test]
fn a_list_of_rumours_gives_players_different_clues_and_the_same_one_on_every_open() {
    let mut spec = example();
    spec["hint"] = json!([
        "I heard {payee} is waiting on money.",
        "Somebody said a reference starting {ref_head}.",
        "It is around {amount_near}, for {item}.",
        "Word is {payee} sent {item} over.",
    ]);
    let mut h = host(vec![], closed());
    let ct = seal(&mut h, &spec);
    let mut seen = std::collections::BTreeSet::new();
    for n in 0..24 {
        let player = format!("player-{n}");
        let first = open_as(&mut h, &ct, &player);
        let text = first["street"]["queue"][0]["lines"][0]["text"].as_str().unwrap().to_string();
        let note = first["street"]["queue"][0]["lines"][0]["note"].as_str().unwrap().to_string();
        assert_eq!(text, note, "the desk note says only what the rumour said");
        assert!(!text.contains('{'), "{text}");
        seen.insert(text.chars().take(8).collect::<String>());
    }
    assert!(seen.len() >= 3, "players should hear different rumours: {seen:?}");
    // The same player opening again hears the same rumour.
    let a = open_as(&mut h, &ct, "player-3");
    let b = open_as(&mut h, &ct, "player-3");
    assert_eq!(a["street"], b["street"]);
}

#[test]
fn a_hint_that_hands_over_the_whole_bill_fails_the_fairness_test() {
    let mut spec = example();
    spec["hint"] = json!("Booking {reference}, refund {amount}, payee {payee}.");
    let out = check(&spec, "500000000");
    assert_eq!(out["pass"], false, "{out}");
    assert!(out["failures"].as_array().unwrap().iter().any(|w| w.as_str().unwrap().contains("whole bill")), "{out}");
    let mut list = example();
    list["hint"] = json!(["Only {payee}.", "Around {amount_near}."]);
    assert!(check(&list, "500000000")["warnings"].as_array().unwrap().is_empty());
}

#[test]
fn seven_hints_are_refused() {
    let mut spec = example();
    spec["hint"] = json!(["a", "b", "c", "d", "e", "f", "g"]);
    assert!(spec_err(spec).contains("1 to 6"));
}
