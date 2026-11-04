//! Plan 15: a story must be too wide to guess, the guard seals only a story that passed, and the
//! model is told names and nothing else.

use serde_json::{json, Value};

use crate::chat::{leaks_with, numbers_in};
use crate::ledger::Line;
use crate::spec_tests::example;
use crate::tests::{closed, host, json as parse_json};
use crate::handle;

fn check(spec: &Value, cap: &str) -> Value {
    let mut h = host(vec![], closed());
    parse_json(&handle(&json!({"op": "check_spec", "spec": spec, "cap": cap}).to_string(), &mut h))
}

fn seal(spec: &Value, ack: Option<bool>, cap: &str) -> Value {
    let mut h = host(vec![], closed());
    let mut body = json!({"op": "seal_spec", "vault_id": "v", "spec": spec, "cap": cap});
    if let Some(ack) = ack {
        body["ack_hint"] = json!(ack);
    }
    parse_json(&handle(&body.to_string(), &mut h))
}

fn failed(out: &Value, needle: &str) -> bool {
    out["failures"].as_array().map_or(false, |f| f.iter().any(|m| m.as_str().unwrap().contains(needle)))
}

fn one_line(reference: &str, lo: &str, hi: &str) -> Value {
    let mut s = example();
    s["lines"] = json!([
        {"payee": "Coastline Drinks", "reference": reference, "item": "bar delivery", "qty": {"lo": 1, "hi": 1}, "unit": {"lo": lo, "hi": hi}, "paid": false},
        {"payee": "Tunde Adeyemi", "reference": "", "item": "security shifts", "qty": {"lo": 1, "hi": 1}, "unit": {"lo": "60", "hi": "60"}, "paid": true}
    ]);
    s
}

#[test]
fn an_unpaid_line_with_no_reference_and_a_fixed_amount_fails_the_guess_check() {
    let out = check(&one_line("", "40", "40"), "500000000");
    assert_eq!(out["pass"], false);
    assert!(failed(&out, "1 chance in 1 of hitting"), "{out}");
}

#[test]
fn a_narrow_line_fails_and_a_line_at_the_threshold_passes() {
    // d3 is 1,000 references and 101 totals: 101,000.
    let narrow = check(&one_line("CD-{d3}", "30", "31"), "500000000");
    assert!(failed(&narrow, "1 chance in 101000"), "{narrow}");
    // d4 is 10,000 references and 51 totals: 510,000.
    let wide = check(&one_line("CD-{d4}", "10", "10.50"), "500000000");
    assert_eq!(wide["pass"], true, "{wide}");
}

#[test]
fn a_paid_line_is_not_held_to_the_guess_check() {
    let out = check(&one_line("CD-{d4}", "10", "10.50"), "500000000");
    assert!(!failed(&out, "Line 2"));
}

#[test]
fn seal_refuses_a_story_that_fails_and_says_why() {
    let out = seal(&one_line("", "40", "40"), Some(true), "500000000");
    assert_eq!(out["ok"], false);
    assert!(out["detail"].as_str().unwrap().starts_with("The fairness test failed"));
    assert!(out.get("spec_ct").is_none());
}

#[test]
fn a_hint_is_not_sealed_without_an_acknowledgment() {
    for ack in [None, Some(false)] {
        let out = seal(&example(), ack, "500000000");
        assert_eq!(out["ok"], false);
        assert!(out["detail"].as_str().unwrap().contains("hint"));
        assert!(out.get("spec_ct").is_none());
    }
}

#[test]
fn a_passing_story_seals_and_reports_its_warnings() {
    let out = seal(&example(), Some(true), "500000000");
    assert_eq!(out["ok"], true, "{out}");
    assert!(out["spec_ct"].as_str().is_some());
    assert!(out["warnings"].is_array());
    let mut no_hint = example();
    no_hint.as_object_mut().unwrap().remove("hint");
    assert_eq!(seal(&no_hint, None, "500000000")["ok"], true);
}

#[test]
fn seal_needs_a_cap() {
    let mut h = host(vec![], closed());
    for body in [json!({"op": "seal_spec", "vault_id": "v", "spec": example()}), json!({"op": "seal_spec", "vault_id": "v", "spec": example(), "cap": "0"})] {
        assert_eq!(parse_json(&handle(&body.to_string(), &mut h))["error"], "bad cap");
    }
}

#[test]
fn the_model_is_told_the_names_and_nothing_else() {
    use crate::ledger::{generate, Venue};
    let mut h = host(vec![Ok("Evening.".into())], closed());
    let out = parse_json(&handle(
        &json!({"op": "open", "vault_id": "velvet-1", "round": 1, "player_id": "ada", "raid_id": "r1", "claim_pk": hex::encode([7u8; 32]), "venue": "velvet", "rule": "pay-the-bill"}).to_string(),
        &mut h,
    ));
    let blob = out["blob"].as_str().unwrap().to_string();
    handle(&json!({"op": "say", "vault_id": "velvet-1", "round": 1, "player_id": "ada", "blob": blob, "text": "Anything I should know tonight?"}).to_string(), &mut h);
    let prompt = h.model.last_user.clone();
    assert!(prompt.contains("DJ K-Nova"));
    let lines = generate(&[9u8; 32], "velvet-1", 1, "ada", Venue::Velvet);
    for line in &lines {
        assert!(!prompt.contains(&line.reference) || line.reference.is_empty(), "a reference reached the model");
        assert!(!prompt.contains(&line.item), "an item reached the model");
        assert!(!prompt.contains(&(line.total / 1_000_000).to_string()), "an amount reached the model");
    }
    assert!(!prompt.contains("paid"));
    assert!(!prompt.contains('|'));
    assert!(h.model.last_system.contains("Never decide a payout"));
}

fn line(reference: &str, whole: u128, cents: u128) -> Line {
    let total = whole * 1_000_000 + cents * 10_000;
    Line { payee: "Coastline Drinks".into(), reference: reference.into(), item: "bar".into(), qty: 1, unit: total, total, paid: false }
}

#[test]
fn a_paraphrased_amount_is_a_leak() {
    let lines = [line("CD-1234", 40, 0)];
    for reply in ["That comes to about forty.", "It was 40 I think.", "Around forty dollars, yes."] {
        assert!(leaks_with(reply, &lines, 6), "{reply}");
    }
    let odd = [line("CD-1234", 40, 50)];
    assert!(leaks_with("Forty-one, near enough.", &odd, 6));
    assert!(leaks_with("About forty", &odd, 6));
    assert!(!leaks_with("Send your invoice through and I will look.", &lines, 6));
}

#[test]
fn everyday_small_numbers_and_unrelated_amounts_are_not_leaks() {
    let lines = [line("CD-1234", 5, 0), line("CD-9999", 120, 0)];
    assert!(!leaks_with("Give me five minutes.", &lines, 6));
    assert!(!leaks_with("It took fifty years to build.", &lines, 6));
    assert!(leaks_with("One hundred and twenty, I think.", &lines, 6));
}

#[test]
fn part_of_a_reference_is_a_leak() {
    let lines = [line("VLV-B-969", 99, 0)];
    assert!(leaks_with("It ends in 969, doesn't it?", &lines, 6));
    assert!(!leaks_with("It ends in 96, doesn't it?", &lines, 6));
}

#[test]
fn spoken_and_written_numbers_are_read() {
    assert_eq!(numbers_in("forty-one"), vec![41]);
    assert_eq!(numbers_in("two hundred and fifty"), vec![250]);
    assert_eq!(numbers_in("one thousand two hundred"), vec![1200]);
    assert_eq!(numbers_in("1,200 and 7"), vec![1200, 7]);
    assert!(numbers_in("no numbers here").is_empty());
}
