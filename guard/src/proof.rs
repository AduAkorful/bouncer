//! Evidence that a reply came from an attested model. It is evidence only: it never gates play and
//! never touches the verdict. Anything that does not check out is dropped, so a field is present only
//! when it matched.

use serde_json::{json, Value};
use sha2::{Digest, Sha256};

pub fn sha256_hex(bytes: &[u8]) -> String {
    hex::encode(Sha256::digest(bytes))
}

/// The model's signature over one completion, tied to the exact bytes that were sent and received.
/// NEAR AI signs `<model>:<sha256 of request body>:<sha256 of response body>`. A signature whose text does
/// not match the bytes we hold is not evidence, and gives nothing.
pub fn reply_proof(model: &str, request: &[u8], response: &[u8], signature: &[u8]) -> Option<Value> {
    let completion: Value = serde_json::from_slice(response).ok()?;
    let chat_id = completion.get("id")?.as_str()?;
    let sig: Value = serde_json::from_slice(signature).ok()?;
    let text = sig.get("text")?.as_str()?;
    let request_sha256 = sha256_hex(request);
    let response_sha256 = sha256_hex(response);
    if text != format!("{model}:{request_sha256}:{response_sha256}") {
        return None;
    }
    Some(json!({
        "model": model,
        "chat_id": chat_id,
        "request_sha256": request_sha256,
        "response_sha256": response_sha256,
        "signature_text": text,
        "signature": sig.get("signature")?.as_str()?,
        "signing_address": sig.get("signing_address")?.as_str()?,
        "signing_algo": sig.get("signing_algo")?.as_str()?,
        "signature_kind": sig.get("signature_kind").and_then(Value::as_str).unwrap_or(""),
    }))
}

/// What the attestation report for the model said, once per raid and before any completion. The report
/// itself is large, so only its hash and the fields a reader compares come back. The nonce is the one the
/// guard chose, so a reader can ask for a report with the same nonce and compare.
pub fn preflight_proof(model: &str, nonce: &str, report: &[u8]) -> Option<Value> {
    let parsed: Value = serde_json::from_slice(report).ok()?;
    let entry = parsed
        .get("model_attestations")?
        .as_array()?
        .iter()
        .find(|e| e.get("model_name").and_then(Value::as_str) == Some(model))?;
    if entry.get("request_nonce").and_then(Value::as_str) != Some(nonce) {
        return None;
    }
    Some(json!({
        "model": model,
        "nonce": nonce,
        "report_sha256": sha256_hex(report),
        "report_bytes": report.len(),
        "signing_address": entry.get("signing_address")?.as_str()?,
        "signing_algo": entry.get("signing_algo")?.as_str()?,
        "gateway_signing_address": parsed
            .get("gateway_attestation")
            .and_then(|g| g.get("signing_address"))
            .and_then(Value::as_str)
            .unwrap_or(""),
    }))
}

#[cfg(test)]
mod tests {
    use super::*;

    // Captured from NEAR AI Cloud on 10 Nov 2026 (one real completion and its signature).
    const REQUEST: &[u8] = include_bytes!("../fixtures/near-request.json");
    const RESPONSE: &[u8] = include_bytes!("../fixtures/near-completion.json");
    const SIGNATURE: &[u8] = include_bytes!("../fixtures/near-signature.json");
    const REPORT: &[u8] = include_bytes!("../fixtures/near-report-trimmed.json");
    const MODEL: &str = "z-ai/glm-5.3-flash";
    const NONCE: &str = "a4ef9fc127dbe3e73feccc345270783f0de76a4eb4a6ec783656e8e9335f5878";

    #[test]
    fn a_real_signature_matches_its_exact_bytes() {
        let proof = reply_proof(MODEL, REQUEST, RESPONSE, SIGNATURE).expect("proof");
        assert_eq!(proof["chat_id"], "0636a4d504144065a3d05f05194db009");
        assert_eq!(proof["request_sha256"], "d778dcc985af4d81768f394eb40a872e1b6825de7fce378a860531b6af867d2d");
        assert_eq!(proof["response_sha256"], "9b0e1edd6545272b13daedab454eddc9603c91e4115b0c9f39db404424584025");
        assert_eq!(proof["signing_address"], "0x3b753b4406613c5e70ae640508632b600424fa0c");
    }

    #[test]
    fn one_changed_byte_gives_no_proof() {
        let mut response = RESPONSE.to_vec();
        let last = response.len() - 1;
        response[last] ^= 1;
        assert!(reply_proof(MODEL, REQUEST, &response, SIGNATURE).is_none());
        let mut request = REQUEST.to_vec();
        request[3] ^= 1;
        assert!(reply_proof(MODEL, &request, RESPONSE, SIGNATURE).is_none());
        assert!(reply_proof("another/model", REQUEST, RESPONSE, SIGNATURE).is_none());
    }

    #[test]
    fn unusable_inputs_give_no_proof() {
        assert!(reply_proof(MODEL, REQUEST, b"not json", SIGNATURE).is_none());
        assert!(reply_proof(MODEL, REQUEST, RESPONSE, b"{}").is_none());
        assert!(reply_proof(MODEL, REQUEST, RESPONSE, br#"{"error_code":"unavailable","message":"later"}"#).is_none());
    }

    #[test]
    fn the_report_must_answer_our_nonce_for_our_model() {
        let proof = preflight_proof(MODEL, NONCE, REPORT).expect("proof");
        assert_eq!(proof["signing_address"], "0x3b753b4406613c5e70ae640508632b600424fa0c");
        assert_eq!(proof["report_sha256"], sha256_hex(REPORT));
        assert!(preflight_proof(MODEL, &"0".repeat(64), REPORT).is_none());
        assert!(preflight_proof("another/model", NONCE, REPORT).is_none());
        assert!(preflight_proof(MODEL, NONCE, b"{}").is_none());
    }

    #[test]
    fn the_signing_address_in_the_report_is_the_one_that_signed() {
        let report = preflight_proof(MODEL, NONCE, REPORT).expect("report");
        let reply = reply_proof(MODEL, REQUEST, RESPONSE, SIGNATURE).expect("reply");
        assert_eq!(report["signing_address"], reply["signing_address"]);
    }
}
