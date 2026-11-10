//! WASI Preview 2 entry. Stdin is one JSON operation. Stdout is one JSON result.
//! This binary builds for wasm32-wasip2. The host signs. The model does not.

fn main() {
    #[cfg(all(target_arch = "wasm32", target_os = "wasi"))]
    entry::run();
}

#[cfg(all(target_arch = "wasm32", target_os = "wasi"))]
#[used]
#[link_section = "outlayer.manifest"]
static OUTLAYER_MANIFEST: [u8; include_bytes!("../manifest.json").len()] = *include_bytes!("../manifest.json");

#[cfg(all(target_arch = "wasm32", target_os = "wasi"))]
mod entry {
    use guard::{
        door_from_reports, handle, Budget, Chain, DoorView, Host, Model, Random, Sealer, Signer, MAX_TOKENS,
        MODEL_ID, TEMPERATURE_MILLI,
    };

    use crate::OUTLAYER_MANIFEST;

    const COMPLETIONS: &str = "https://cloud-api.near.ai/v1/chat/completions";
    const SIGNATURES: &str = "https://cloud-api.near.ai/v1/signature";
    const REPORT: &str = "https://cloud-api.near.ai/v1/attestation/report";

    pub fn run() {
        let _manifest = &OUTLAYER_MANIFEST;
        let input = outlayer::env::input_string().unwrap_or_default();
        let seed = match read_seed() {
            Ok(seed) => seed,
            Err(error) => {
                outlayer::env::output_string(&refuse(error));
                return;
            }
        };
        let mut host = Host {
            seed,
            model: Cloud::default(),
            signer: ProjectKey,
            chain: VaultDoor,
            random: OsRandom,
            budget: Marks,
            sealer: Box::new(SpecKey),
        };
        let output = scrub(handle(&input, &mut host), &seed);
        outlayer::env::output_string(&output);
    }

    fn read_seed() -> Result<[u8; 32], &'static str> {
        let text = std::env::var("PROTECTED_SEED").map_err(|_| "seed")?;
        let bytes = hex::decode(text.trim()).map_err(|_| "seed")?;
        bytes.try_into().map_err(|_| "seed")
    }

    fn scrub(output: String, seed: &[u8; 32]) -> String {
        let lower = hex::encode(seed);
        let upper = lower.to_ascii_uppercase();
        if output.contains(&lower) || output.contains(&upper) {
            return refuse("seed");
        }
        output
    }

    fn refuse(error: &str) -> String {
        format!(r#"{{"ok":false,"error":"{error}"}}"#)
    }

    /// The exact bytes of the last completion, kept so its signature can be tied to them.
    #[derive(Default)]
    struct Cloud {
        last: Option<(Vec<u8>, Vec<u8>)>,
    }

    impl Model for Cloud {
        fn complete(&mut self, system: &str, user: &str) -> Result<String, ()> {
            self.last = None;
            match complete_cloud(system, user, None) {
                Ok((text, request, response)) => {
                    self.last = Some((request, response));
                    Ok(text)
                }
                Err(stage) => {
                    eprintln!("{}", stage.label());
                    Err(())
                }
            }
        }
        fn complete_draft(&mut self, system: &str, user: &str) -> Result<String, guard::model_diagnostic::ModelFailure> {
            complete_cloud(system, user, Some(std::time::Duration::from_secs(50))).map(|(text, _, _)| text)
        }
        fn evidence(&mut self) -> Option<serde_json::Value> {
            let (request, response) = self.last.take()?;
            let key = std::env::var("NEAR_AI_KEY").ok().filter(|k| !k.is_empty())?;
            let id = serde_json::from_slice::<serde_json::Value>(&response).ok()?.get("id")?.as_str()?.to_string();
            // The signature can lag the completion by a moment, so one more try is made.
            for _ in 0..2 {
                let url = format!("{SIGNATURES}/{id}?model={MODEL_ID}&signing_algo=ecdsa");
                let sent = wasi_http_client::Client::new()
                    .get(&url)
                    .header("Authorization", format!("Bearer {key}"))
                    .header("Accept-Encoding", "identity")
                    .send();
                let Ok(reply) = sent else { continue };
                if !(200..300).contains(&reply.status()) { continue }
                let Ok(bytes) = reply.body() else { continue };
                if let Some(proof) = guard::proof::reply_proof(MODEL_ID, &request, &response, &bytes) {
                    return Some(proof);
                }
            }
            None
        }
        fn preflight(&mut self) -> Option<serde_json::Value> {
            let mut raw = [0u8; 32];
            getrandom::getrandom(&mut raw).ok()?;
            let nonce = hex::encode(raw);
            let url = format!("{REPORT}?signing_algo=ecdsa&nonce={nonce}&model={MODEL_ID}&provider=near");
            let reply = wasi_http_client::Client::new()
                .get(&url)
                .header("Accept", "application/json")
                .header("Accept-Encoding", "identity")
                .header("x-no-aliasing", "true")
                .send()
                .ok()?;
            if !(200..300).contains(&reply.status()) { return None }
            let bytes = reply.body().ok()?;
            guard::proof::preflight_proof(MODEL_ID, &nonce, &bytes)
        }
    }

    /// Returns the reply text with the exact request and response bytes, for the evidence that follows.
    fn complete_cloud(system: &str, user: &str, connect_timeout: Option<std::time::Duration>) -> Result<(String, Vec<u8>, Vec<u8>), guard::model_diagnostic::ModelFailure> {
        use guard::model_diagnostic::{completion_content, ModelFailure as F};
        let key = std::env::var("NEAR_AI_KEY").map_err(|_| F::Key)?;
        if key.is_empty() { return Err(F::Key); }
        let body = serde_json::json!({
            "model": MODEL_ID,
            "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
            "max_tokens": MAX_TOKENS, "temperature": 0.7, "stream": false
        });
        let payload = serde_json::to_vec(&body).map_err(|_| F::Encode)?;
        if payload.windows(key.len()).any(|window| window == key.as_bytes()) { return Err(F::SensitivePayload); }
        let request = wasi_http_client::Client::new()
            .post(COMPLETIONS)
            .header("Content-Type", "application/json")
            .header("Authorization", format!("Bearer {key}"))
            .header("Accept-Encoding", "identity")
            .header("x-no-aliasing", "true")
            .body(&payload);
        let request = match connect_timeout {
            Some(timeout) => request.connect_timeout(timeout),
            None => request,
        };
        let response = request.send().map_err(|error| {
                guard::model_diagnostic::transport_category(error.downcast_ref::<wasi::http::types::ErrorCode>())
            })?;
        if !(200..300).contains(&response.status()) { return Err(F::Http); }
        let bytes = response.body().map_err(|_| F::Body)?;
        let text = completion_content(&bytes, &key)?;
        Ok((text, payload, bytes))
    }

    struct ProjectKey;

    impl Signer for ProjectKey {
        fn public_key(&self) -> [u8; 32] {
            let bytes = outlayer::signing_keys::public_key("verdict", None).unwrap_or_default();
            bytes.try_into().unwrap_or_else(|_| panic!("key"))
        }

        fn sign(&mut self, message: &[u8]) -> [u8; 64] {
            let bytes = outlayer::signing_keys::sign("verdict", None, message).unwrap_or_default();
            bytes.try_into().unwrap_or_else(|_| panic!("sign"))
        }
    }

    struct VaultDoor;

    impl Chain for VaultDoor {
        fn door(&self, vault_id: &str) -> Result<DoorView, ()> {
            let account = std::env::var("VAULT_ACCOUNT").map_err(|_| ())?;
            if account.is_empty() {
                return Err(());
            }
            let args = serde_json::json!({"vault_id": vault_id}).to_string();
            let (view_ok, view_err) = outlayer::raw::rpc::view(&account, "get_vault", &args, "final");
            let (block_ok, block_err) = outlayer::raw::rpc::block("final");
            door_from_reports(&view_ok, &view_err, &block_ok, &block_err)
        }
    }

    /// The project's `spec` encryption key. The host seals and opens. The guest never holds it.
    struct SpecKey;

    impl Sealer for SpecKey {
        fn seal(&self, aad: &[u8], plain: &[u8]) -> Result<Vec<u8>, ()> {
            outlayer::encryption_keys::encrypt("spec", None, plain, aad).map_err(|_| ())
        }

        fn open(&self, aad: &[u8], ciphertext: &[u8]) -> Result<Vec<u8>, ()> {
            outlayer::encryption_keys::decrypt("spec", None, ciphertext, aad).map_err(|_| ())
        }
    }

    struct OsRandom;

    impl Random for OsRandom {
        fn nonce(&mut self) -> [u8; 12] {
            let mut nonce = [0u8; 12];
            getrandom::getrandom(&mut nonce).unwrap_or_else(|_| panic!("random"));
            nonce
        }
    }

    struct Marks;

    impl Budget for Marks {
        fn seen(&self, key: &str) -> u8 {
            match outlayer::storage::get_worker(&mark_key(key)) {
                Ok(Some(bytes)) if bytes.len() == 1 && bytes[0] <= 6 => bytes[0],
                Ok(None) => 0,
                _ => u8::MAX,
            }
        }

        fn record(&mut self, key: &str, used: u8) {
            if outlayer::storage::set_worker(&mark_key(key), &[used]).is_err() {
                panic!("mark");
            }
        }

        fn last(&self, key: &str) -> Option<(String, String)> {
            let bytes = outlayer::storage::get_worker(&reply_key(key)).ok()??;
            let row: serde_json::Value = serde_json::from_slice(&bytes).ok()?;
            Some((row.get("hash")?.as_str()?.to_string(), row.get("response")?.as_str()?.to_string()))
        }

        fn keep(&mut self, key: &str, hash: &str, response: &str) -> Result<(), ()> {
            let row = serde_json::json!({"hash": hash, "response": response});
            let bytes = serde_json::to_vec(&row).map_err(|_| ())?;
            outlayer::storage::set_worker(&reply_key(key), &bytes).map_err(|_| ())
        }
    }

    fn reply_key(key: &str) -> String {
        format!("reply:{key}")
    }

    fn mark_key(key: &str) -> String {
        format!("used:{key}")
    }

    const _: () = assert!(TEMPERATURE_MILLI == 700);
}
