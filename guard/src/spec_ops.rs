//! The ops a sponsor uses: seal a spec, test it, draft one, and get a round's signed commitment.

use serde_json::{json, Map, Value};
use sha2::{Digest, Sha256};

use crate::draft::{extract_object, DRAFT_SYSTEM, MAX_STORY};
use crate::host::{Host, Model, Random, Signer};
use crate::ids::require_id;
use crate::spec::{parse, Spec, MAX_DECIMALS, MIN_DECIMALS};
use crate::spec_check::check;
use crate::spec_ledger::{spec_commitment, spec_guard_version};
use crate::verdict::{commit_bytes, commitment, GENERATOR};

/// Canonical text of a spec value, its hash, and the parsed spec.
fn canonical(value: &Value) -> Result<(String, [u8; 32], Spec), String> {
    let text = serde_json::to_string(value).map_err(|_| "The spec is not valid JSON.".to_string())?;
    let spec = parse(&text)?;
    let hash = Sha256::digest(text.as_bytes()).into();
    Ok((text, hash, spec))
}

fn spec_value(input: &Value) -> Result<Value, String> {
    match input.get("spec") {
        Some(Value::String(text)) => serde_json::from_str(text).map_err(|_| "The spec is not valid JSON.".to_string()),
        Some(value) => Ok(value.clone()),
        None => Err("The call has no spec.".into()),
    }
}

fn spec_error(detail: &str) -> String {
    json!({"ok": false, "error": "spec", "detail": detail}).to_string()
}

fn error(code: &str) -> String {
    json!({"ok": false, "error": code}).to_string()
}

/// Seals a spec that passed the fairness test. The ciphertext can only exist for a story that is fair
/// to the pot, because the vault cannot look inside it and the guard is the only thing that can make one.
pub fn seal_spec<M, S, C, R, B>(input: &Value, host: &Host<M, S, C, R, B>) -> String {
    let vault_id = match input.get("vault_id").and_then(|v| v.as_str()) {
        Some(id) if require_id(id) => id,
        _ => return error("bad id"),
    };
    let cap = match input.get("cap").and_then(|v| v.as_str()).and_then(|c| c.parse::<u128>().ok()) {
        Some(cap) if cap > 0 => cap,
        _ => return error("bad cap"),
    };
    let value = match spec_value(input) {
        Ok(value) => value,
        Err(detail) => return spec_error(&detail),
    };
    let (text, hash, spec) = match canonical(&value) {
        Ok(parts) => parts,
        Err(detail) => return spec_error(&detail),
    };
    if spec.hint.is_some() && input.get("ack_hint").and_then(|v| v.as_bool()) != Some(true) {
        return spec_error("A hint tells every player one bill that will be paid. Confirm that you want it to seal this story.");
    }
    let report = check(&spec, &hash, cap);
    if !report.failures.is_empty() {
        return json!({
            "ok": false,
            "error": "spec",
            "detail": format!("The fairness test failed: {}", report.failures[0]),
            "failures": report.failures,
        })
        .to_string();
    }
    match host.sealer.seal(vault_id.as_bytes(), text.as_bytes()) {
        Ok(ct) => json!({"ok": true, "spec_ct": hex::encode(ct), "spec_hash": hex::encode(hash), "warnings": report.warnings}).to_string(),
        Err(()) => error("seal"),
    }
}

pub fn check_spec(input: &Value) -> String {
    let cap = match input.get("cap").and_then(|v| v.as_str()).and_then(|c| c.parse::<u128>().ok()) {
        Some(cap) if cap > 0 => cap,
        _ => return error("bad cap"),
    };
    let value = match spec_value(input) {
        Ok(value) => value,
        Err(detail) => return spec_error(&detail),
    };
    let (_, hash, spec) = match canonical(&value) {
        Ok(parts) => parts,
        Err(detail) => return spec_error(&detail),
    };
    let report = check(&spec, &hash, cap);
    json!({
        "ok": true,
        "pass": report.failures.is_empty(),
        "failures": report.failures,
        "warnings": report.warnings,
        "spec_hash": hex::encode(hash),
    })
    .to_string()
}

pub fn draft_spec<M, S, C, R, B>(input: &Value, host: &mut Host<M, S, C, R, B>) -> String
where
    M: Model,
    R: Random,
{
    let story = match input.get("story").and_then(|v| v.as_str()) {
        Some(story) if !story.trim().is_empty() && story.chars().count() <= MAX_STORY => story,
        _ => return error("bad story"),
    };
    let decimals = match input.get("decimals").and_then(|v| v.as_u64()) {
        Some(d) if (MIN_DECIMALS..=MAX_DECIMALS).contains(&d) => d,
        _ => return error("bad decimals"),
    };
    let answer = match host.model.complete_draft(DRAFT_SYSTEM, story) {
        Ok(answer) => answer,
        Err(stage) => return json!({"ok": false, "error": "model", "stage": stage.label()}).to_string(),
    };
    let mut object: Map<String, Value> = match extract_object(&answer).and_then(|t| serde_json::from_str(t).ok()) {
        Some(object) => object,
        None => return spec_error("The draft did not come back as a spec. Try again or write it by hand."),
    };
    let mut salt = host.random.nonce().to_vec();
    salt.extend(&host.random.nonce()[..4]);
    object.insert("v".into(), json!(1));
    object.insert("salt".into(), json!(hex::encode(salt)));
    object.insert("decimals".into(), json!(decimals));
    let value = Value::Object(object);
    match canonical(&value) {
        Ok(_) => json!({"ok": true, "spec": value}).to_string(),
        Err(detail) => spec_error(&format!("The draft is not a valid spec: {detail}")),
    }
}

/// The signed commitment the vault checks at `commit_round`. A built-in door has no `spec_ct`.
pub fn commit<M, S, C, R, B>(input: &Value, host: &mut Host<M, S, C, R, B>) -> String
where
    S: Signer,
{
    let vault_id = match input.get("vault_id").and_then(|v| v.as_str()) {
        Some(id) if require_id(id) => id.to_string(),
        _ => return error("bad id"),
    };
    let round = match input.get("round").and_then(|v| v.as_u64()) {
        Some(round) => round,
        None => return error("bad id"),
    };
    let (commit_value, version, spec_hash) = if input.get("spec_ct").is_some() {
        match crate::rules::open_spec(host, &vault_id, input) {
            Ok((_, hash)) => (spec_commitment(&GENERATOR, &host.seed, &hash), spec_guard_version(&GENERATOR, &hash), Some(hash)),
            Err(e) => return error(e),
        }
    } else {
        (commitment(&host.seed), GENERATOR, None)
    };
    let message = match commit_bytes(&vault_id, round, commit_value, version) {
        Ok(message) => message,
        Err(e) => return error(e),
    };
    let signature = host.signer.sign(&message);
    let mut out = json!({
        "ok": true,
        "commitment": hex::encode(commit_value),
        "guard_version": hex::encode(version),
        "signature": hex::encode(signature),
    });
    if let Some(hash) = spec_hash {
        out["spec_hash"] = json!(hex::encode(hash));
    }
    out.to_string()
}
