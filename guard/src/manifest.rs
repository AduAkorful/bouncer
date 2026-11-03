use serde_json::Value;

pub const MODEL_ID: &str = "z-ai/glm-5.3-flash";
pub const MAX_TOKENS: u32 = 4096;
pub const TEMPERATURE_MILLI: u32 = 700;
pub const NETWORK_HOST: &str = "cloud-api.near.ai";

/// The bytes the wasm custom section must carry. A missing network list is unrestricted
/// on a normal OutLayer project, so this check fails closed.
pub fn check_manifest(text: &str) -> Result<(), &'static str> {
    let value: Value = serde_json::from_str(text).map_err(|_| "manifest")?;
    let network = value
        .pointer("/capabilities/network")
        .and_then(|v| v.as_array())
        .ok_or("network")?;
    if network.len() != 1 || network[0].as_str() != Some(NETWORK_HOST) {
        return Err("network");
    }
    let keys = value.get("signing_keys").and_then(|v| v.as_array()).ok_or("signing key")?;
    if keys.len() != 1 {
        return Err("signing key");
    }
    let key = &keys[0];
    if key.get("path").and_then(|v| v.as_str()) != Some("verdict")
        || key.get("type").and_then(|v| v.as_str()) != Some("ed25519")
        || key.get("bind").and_then(|v| v.as_str()) != Some("project")
        || key.get("caller").and_then(|v| v.as_str()) != Some("signer")
    {
        return Err("signing key");
    }
    let profile = value
        .pointer("/author_secrets/profile")
        .and_then(|v| v.as_str())
        .ok_or("secrets")?;
    if profile.is_empty() {
        return Err("secrets");
    }
    Ok(())
}
