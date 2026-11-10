use serde_json::{json, Value};

use crate::chat::{leaks_with, user_prompt_with, APPROVED, FALLBACK, REFUSAL};
use crate::host::{Budget, Chain, Host, Model, Random, Signer};
use crate::ids::require_id;
use crate::ledger::{generate, match_bill_with, Draft, Hit, Rule, Venue};
use crate::rules::{self, Rules};
use crate::spec_ops;
use crate::session::{seal, unseal, Session, Turn, PLAYER, GUARD};
use crate::street::{street, street_custom};
use crate::verdict::{sha256, bill_hash, commitment, conversation_hash, reveal_bytes, verdict_bytes, VerdictBody};
use crate::spec_ledger::spec_commitment;
use crate::verdict::GENERATOR;

const MAX_TEXT: usize = 500;
const MAX_FIELD: usize = 80;

pub fn handle<M, S, C, R, B>(input: &str, host: &mut Host<M, S, C, R, B>) -> String
where
    M: Model,
    S: Signer,
    C: Chain,
    R: Random,
    B: Budget,
{
    let value: Value = match serde_json::from_str(input) {
        Ok(value) => value,
        Err(_) => return fail("bad json"),
    };
    match value.get("op").and_then(|v| v.as_str()).unwrap_or("") {
        "pubkey" => pubkey(host),
        "commit" => spec_ops::commit(&value, host),
        "seal_spec" => spec_ops::seal_spec(&value, host),
        "check_spec" => spec_ops::check_spec(&value),
        "draft_spec" => spec_ops::draft_spec(&value, host),
        "open" => open(&value, host),
        "say" => say(&value, host),
        "bill" => bill(&value, host),
        "reveal" => reveal(&value, host),
        _ => fail("unknown"),
    }
}

fn pubkey<M, S, C, R, B>(host: &Host<M, S, C, R, B>) -> String
where
    S: Signer,
{
    json!({"ok": true, "public_key": hex::encode(host.signer.public_key())}).to_string()
}

fn open<M, S, C, R, B>(value: &Value, host: &mut Host<M, S, C, R, B>) -> String
where
    M: Model,
    R: Random,
{
    let vault_id = match id_field(value, "vault_id") {
        Ok(id) => id,
        Err(error) => return fail(error),
    };
    let player_id = match id_field(value, "player_id") {
        Ok(id) => id,
        Err(error) => return fail(error),
    };
    let raid_id = match id_field(value, "raid_id") {
        Ok(id) => id,
        Err(error) => return fail(error),
    };
    let round = match value.get("round").and_then(|v| v.as_u64()) {
        Some(round) => round,
        None => return fail("bad id"),
    };
    let venue_name = value.get("venue").and_then(|v| v.as_str()).unwrap_or("");
    let (venue, spec) = if venue_name == "custom" {
        match rules::open_spec(host, &vault_id, value) {
            Ok(opened) => (None, Some(opened)),
            Err(error) => return fail(error),
        }
    } else {
        match Venue::parse(venue_name) {
            Some(venue) => (Some(venue), None),
            None => return fail("venue"),
        }
    };
    let rule = match value.get("rule").and_then(|v| v.as_str()).and_then(Rule::parse) {
        Some(rule) => rule,
        None => return fail("rule"),
    };
    let claim_pk = match hex_key(value.get("claim_pk").and_then(|v| v.as_str()).unwrap_or("")) {
        Ok(key) => key,
        Err(error) => return fail(error),
    };
    let session = Session {
        vault_id,
        round,
        player_id,
        raid_id,
        claim_pk,
        venue: venue.map_or("custom", Venue::as_str).into(),
        rule: rule.tag(),
        used: 0,
        transcript: Vec::new(),
        spec_hash: spec.as_ref().map(|(_, hash)| *hash),
    };
    let heard = match (&spec, venue) {
        (Some((spec, hash)), _) => {
            let lines = crate::spec_ledger::generate_spec(spec, &host.seed, hash, &session.vault_id, session.round, &session.player_id);
            street_custom(spec, &lines)
        }
        (None, Some(venue)) => street(&host.seed, &session.vault_id, session.round, &session.player_id, venue),
        (None, None) => return fail("venue"),
    };
    match seal(&session, &host.seed, host.random.nonce()) {
        Ok(blob) => {
            let mut response = json!({"ok": true, "blob": blob, "used": 0, "street": heard});
            // Evidence about the model, taken before any reply in this raid. A missing one is simply absent.
            if let Some(preflight) = host.model.preflight() {
                response["model_proof"] = preflight;
            }
            response.to_string()
        }
        Err(error) => fail(error),
    }
}

fn say<M, S, C, R, B>(value: &Value, host: &mut Host<M, S, C, R, B>) -> String
where
    M: Model,
    R: Random,
    B: Budget,
{
    let (blob, mut session) = match load(value, host) {
        Ok(pair) => pair,
        Err(error) => return error,
    };
    let text = match value.get("text").and_then(|v| v.as_str()) {
        Some(text) if !text.trim().is_empty() && text.chars().count() <= MAX_TEXT => text.to_string(),
        _ => return fail("bad text"),
    };
    let hash = turn_hash("say", &blob, &[text.clone()]);
    if let Some(stored) = retry(host, &session, &hash) {
        return stored;
    }
    if session.spent() {
        return fail_blob("spent", &blob);
    }
    if replay(&session, host) {
        return fail_blob("replay", &blob);
    }
    let rules = match rules::for_session(host, &session, value) {
        Ok(rules) => rules,
        Err(error) => return fail_blob(error, &blob),
    };
    let mut proof = None;
    let reply = if let Some(reply) = rules.chip(&text) {
        reply
    } else {
        let prompt = user_prompt_with(&rules.lines, &session.transcript, &text);
        match host.model.complete(&rules.system, &prompt) {
            Err(()) => return fail_blob("model", &blob),
            Ok(answer) if answer.trim().is_empty() || leaks_with(&answer, &rules.lines, rules.decimals) => FALLBACK.to_string(),
            Ok(answer) => {
                // Only a reply the model wrote and the guard kept carries evidence.
                proof = host.model.evidence();
                answer
            }
        }
    };
    spend(&mut session, &text, &reply);
    finish_chat(&session, host, &reply, &hash, proof)
}

fn bill<M, S, C, R, B>(value: &Value, host: &mut Host<M, S, C, R, B>) -> String
where
    M: Model,
    S: Signer,
    R: Random,
    B: Budget,
{
    let (blob, mut session) = match load(value, host) {
        Ok(pair) => pair,
        Err(error) => return error,
    };
    if let Some(rule) = value.get("rule").and_then(|v| v.as_str()) {
        let wanted = match Rule::parse(rule) {
            Some(rule) => rule,
            None => return fail("rule"),
        };
        if session.rule().ok() != Some(wanted) {
            return fail_blob("rule", &blob);
        }
    }
    let draft = match draft(value) {
        Ok(draft) => draft,
        Err(error) => return fail(error),
    };
    let fields = [
        draft.payee.clone(),
        draft.reference.clone(),
        draft.item.clone(),
        draft.qty.to_string(),
        draft.unit.to_string(),
        value.get("rule").and_then(|v| v.as_str()).unwrap_or("").to_string(),
    ];
    let hash = turn_hash("bill", &blob, &fields);
    if let Some(stored) = retry(host, &session, &hash) {
        return stored;
    }
    if session.spent() {
        return fail_blob("spent", &blob);
    }
    if replay(&session, host) {
        return fail_blob("replay", &blob);
    }
    let rule = match session.rule() {
        Ok(rule) => rule,
        Err(error) => return fail(error),
    };
    let rules = match rules::for_session(host, &session, value) {
        Ok(rules) => rules,
        Err(error) => return fail_blob(error, &blob),
    };
    let text = format!(
        "bill:{}|{}|{}|{}|{}",
        draft.payee, draft.reference, draft.item, draft.qty, draft.unit
    );
    match match_bill_with(&draft, &rules.lines, rules.tolerance) {
        Hit::One(line) => approve(host, &blob, &mut session, &rules, &draft, &line, &text, rule, &hash),
        Hit::None | Hit::Many => {
            spend(&mut session, &text, REFUSAL);
            finish_chat(&session, host, REFUSAL, &hash, None)
        }
    }
}

fn approve<M, S, C, R, B>(
    host: &mut Host<M, S, C, R, B>,
    blob: &str,
    session: &mut Session,
    rules: &Rules,
    draft: &Draft,
    line: &crate::ledger::Line,
    text: &str,
    rule: Rule,
    hash: &[u8; 32],
) -> String
where
    M: Model,
    S: Signer,
    R: Random,
    B: Budget,
{
    // The verdict is the guard's rules, not the model's. The model is not asked to word an approval: it is not told
    // the bill passed, and its reply read like a refusal beside a signed win (QA R22-19, R23).
    let proof = None;
    let reply = APPROVED.to_string();
    let amount = match rule {
        Rule::PayTheBill => line.total,
        Rule::SplitTheDay => 0,
    };
    let mut turns = session.transcript.clone();
    turns.push(Turn { role: PLAYER, text: text.into() });
    turns.push(Turn { role: GUARD, text: reply.clone() });
    let bill_hash = match bill_hash(&draft.payee, &draft.reference, &draft.item, draft.qty, draft.unit) {
        Ok(hash) => hash,
        Err(error) => return fail(error),
    };
    let conversation_hash = match conversation_hash(&turns) {
        Ok(hash) => hash,
        Err(error) => return fail(error),
    };
    let body = VerdictBody {
        vault_id: session.vault_id.clone(),
        round: session.round,
        raid_id: session.raid_id.clone(),
        player_id: session.player_id.clone(),
        bill_hash,
        amount,
        claim_pk: session.claim_pk,
        conversation_hash,
        guard_version: rules.guard_version,
    };
    let message = match verdict_bytes(&body) {
        Ok(message) => message,
        Err(error) => return fail(error),
    };
    let signature = host.signer.sign(&message);
    spend(session, text, &reply);
    let sealed = match seal(session, &host.seed, host.random.nonce()) {
        Ok(sealed) => sealed,
        Err(error) => return fail_blob(error, blob),
    };
    let mut response = json!({
        "ok": true,
        "blob": sealed,
        "reply": reply,
        "used": session.used,
        "verdict": {
            "vault_id": body.vault_id,
            "round": body.round,
            "raid_id": body.raid_id,
            "player_id": body.player_id,
            "bill_hash": hex::encode(body.bill_hash),
            "amount": amount.to_string(),
            "claim_pk": hex::encode(body.claim_pk),
            "conversation_hash": hex::encode(body.conversation_hash),
            "guard_version": hex::encode(body.guard_version),
        },
        "signature": hex::encode(signature),
    });
    // The reply is inside the signed conversation hash, so its evidence belongs next to the verdict.
    if let Some(proof) = proof {
        response["proof"] = proof;
    }
    keep_and_record(host, session, hash, response.to_string())
}

fn reveal<M, S, C, R, B>(value: &Value, host: &mut Host<M, S, C, R, B>) -> String
where
    S: Signer,
    C: Chain,
{
    let vault_id = match id_field(value, "vault_id") {
        Ok(id) => id,
        Err(error) => return fail(error),
    };
    let player_id = match id_field(value, "player_id") {
        Ok(id) => id,
        Err(error) => return fail(error),
    };
    let round = match value.get("round").and_then(|v| v.as_u64()) {
        Some(round) => round,
        None => return fail("bad id"),
    };
    let venue_name = value.get("venue").and_then(|v| v.as_str()).unwrap_or("");
    let custom = if venue_name == "custom" {
        match rules::open_spec(host, &vault_id, value) {
            Ok(opened) => Some(opened),
            Err(error) => return fail(error),
        }
    } else {
        None
    };
    let venue = Venue::parse(venue_name);
    if custom.is_none() && venue.is_none() {
        return fail("venue");
    }
    let door = match host.chain.door(&vault_id) {
        Ok(door) => door,
        Err(()) => return fail("view"),
    };
    if door.open || door.now <= door.closes_at {
        return fail("view");
    }
    let (lines, commitment) = match (&custom, venue) {
        (Some((spec, hash)), _) => (
            crate::spec_ledger::generate_spec(spec, &host.seed, hash, &vault_id, round, &player_id),
            spec_commitment(&GENERATOR, &host.seed, hash),
        ),
        (None, Some(venue)) => (generate(&host.seed, &vault_id, round, &player_id, venue), commitment(&host.seed)),
        (None, None) => return fail("venue"),
    };
    let ledger_hash = match crate::verdict::ledger_hash(&lines) {
        Ok(hash) => hash,
        Err(error) => return fail(error),
    };
    let message = match reveal_bytes(&vault_id, round, &player_id, ledger_hash, commitment) {
        Ok(message) => message,
        Err(error) => return fail(error),
    };
    let signature = host.signer.sign(&message);
    let ledger: Vec<Value> = lines
        .iter()
        .map(|line| {
            json!({
                "payee": line.payee,
                "reference": line.reference,
                "item": line.item,
                "qty": line.qty.to_string(),
                "unit": line.unit.to_string(),
                "total": line.total.to_string(),
                "paid": line.paid,
            })
        })
        .collect();
    json!({
        "ok": true,
        "ledger": ledger,
        "ledger_hash": hex::encode(ledger_hash),
        "commitment": hex::encode(commitment),
        "signature": hex::encode(signature),
    })
    .to_string()
}

fn load<M, S, C, R, B>(value: &Value, host: &Host<M, S, C, R, B>) -> Result<(String, Session), String> {
    let vault_id = id_field(value, "vault_id").map_err(fail)?;
    let player_id = id_field(value, "player_id").map_err(fail)?;
    let round = value.get("round").and_then(|v| v.as_u64()).ok_or_else(|| fail("bad id"))?;
    let blob = value.get("blob").and_then(|v| v.as_str()).ok_or_else(|| fail("bad blob"))?.to_string();
    let session = unseal(&blob, &host.seed, &vault_id, round, &player_id).map_err(fail)?;
    Ok((blob, session))
}

fn spend(session: &mut Session, player: &str, reply: &str) {
    session.used = session.used.saturating_add(1);
    session.transcript.push(Turn { role: PLAYER, text: player.into() });
    session.transcript.push(Turn { role: GUARD, text: reply.into() });
}

fn replay<M, S, C, R, B>(session: &Session, host: &Host<M, S, C, R, B>) -> bool
where
    B: Budget,
{
    session.used < host.budget.seen(&budget_key(session))
}

fn budget_key(session: &Session) -> String {
    format!("{}|{}|{}", session.vault_id, session.round, session.player_id)
}

fn finish_chat<M, S, C, R, B>(
    session: &Session,
    host: &mut Host<M, S, C, R, B>,
    reply: &str,
    hash: &[u8; 32],
    proof: Option<Value>,
) -> String
where
    R: Random,
    B: Budget,
{
    match seal(session, &host.seed, host.random.nonce()) {
        Ok(blob) => {
            let mut response = json!({"ok": true, "blob": blob, "reply": reply, "used": session.used});
            if let Some(proof) = proof {
                response["proof"] = proof;
            }
            keep_and_record(host, session, hash, response.to_string())
        }
        Err(error) => fail(error),
    }
}

fn draft(value: &Value) -> Result<Draft, &'static str> {
    Ok(Draft {
        payee: field(value, "payee")?,
        reference: field(value, "reference")?,
        item: field(value, "item")?,
        qty: json_u128(value.get("qty"))?,
        unit: json_u128(value.get("unit"))?,
    })
}

fn field(value: &Value, name: &str) -> Result<String, &'static str> {
    let text = value.get(name).and_then(|v| v.as_str()).ok_or("bad bill")?;
    if text.chars().count() > MAX_FIELD {
        return Err("bad bill");
    }
    Ok(text.to_string())
}

fn id_field(value: &Value, name: &str) -> Result<String, &'static str> {
    let id = value.get(name).and_then(|v| v.as_str()).ok_or("bad id")?;
    if !require_id(id) {
        return Err("bad id");
    }
    Ok(id.to_string())
}

fn hex_key(value: &str) -> Result<[u8; 32], &'static str> {
    let bytes = hex::decode(value).map_err(|_| "bad key")?;
    let key: [u8; 32] = bytes.try_into().map_err(|_| "bad key")?;
    Ok(key)
}

fn json_u128(value: Option<&Value>) -> Result<u128, &'static str> {
    match value {
        Some(Value::String(text)) => text.parse().map_err(|_| "bad bill"),
        Some(Value::Number(number)) => number.as_u64().map(u128::from).ok_or("bad bill"),
        _ => Err("bad bill"),
    }
}

fn fail(error: &str) -> String {
    json!({"ok": false, "error": error}).to_string()
}

fn fail_blob(error: &str, blob: &str) -> String {
    json!({"ok": false, "error": error, "blob": blob}).to_string()
}

/// Unambiguous hash of the call a reply answers: the op, the blob it carried, and its own fields.
fn turn_hash(op: &str, blob: &str, fields: &[String]) -> [u8; 32] {
    let encoded = borsh::to_vec(&(op.to_string(), blob.to_string(), fields.to_vec())).unwrap_or_default();
    sha256(&encoded)
}

/// A lost reply leaves the player with the blob it already held. When that exact call comes back,
/// answer it from the stored reply instead of refusing it as a replay.
fn retry<M, S, C, R, B>(host: &Host<M, S, C, R, B>, session: &Session, hash: &[u8; 32]) -> Option<String>
where
    B: Budget,
{
    if !replay(session, host) {
        return None;
    }
    let (stored, response) = host.budget.last(&budget_key(session))?;
    (stored == hex::encode(hash)).then_some(response)
}

/// Store the reply first, then record the mark. A crash between the two leaves a reply with no mark,
/// and the retry runs as a fresh turn. The reverse order would lose the reply.
fn keep_and_record<M, S, C, R, B>(host: &mut Host<M, S, C, R, B>, session: &Session, hash: &[u8; 32], response: String) -> String
where
    B: Budget,
{
    let key = budget_key(session);
    if host.budget.keep(&key, &hex::encode(hash), &response).is_err() {
        return fail("store");
    }
    host.budget.record(&key, session.used);
    response
}
