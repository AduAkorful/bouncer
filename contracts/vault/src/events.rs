use near_sdk::env;

pub fn guard_key_set(vault_id: &str, round: u64, guard_pk: &[u8; 32]) {
    env::log_str(&format!(
        "{{\"standard\":\"bouncer\",\"version\":\"1.0.0\",\"event\":\"guard_key_set\",\"data\":{{\"vault_id\":\"{vault_id}\",\"round\":{round},\"guard_pk\":\"{}\"}}}}",
        hex32(guard_pk)
    ));
}

fn emit(event: &str, data: &str) {
    env::log_str(&format!(
        "{{\"standard\":\"bouncer\",\"version\":\"1.0.0\",\"event\":\"{event}\",\"data\":{data}}}"
    ));
}

pub fn vault_created(vault_id: &str, sponsor: &str) {
    emit("vault_created", &format!("{{\"vault_id\":\"{vault_id}\",\"sponsor\":\"{sponsor}\"}}"));
}

pub fn spec_set(vault_id: &str, spec_hash: &[u8; 32]) {
    emit("spec_set", &format!("{{\"vault_id\":\"{vault_id}\",\"spec_hash\":\"{}\"}}", hex32(spec_hash)));
}

pub fn keeper_set(vault_id: &str, keeper: Option<&str>) {
    let keeper = keeper.map_or("null".to_string(), |k| format!("\"{k}\""));
    emit("keeper_set", &format!("{{\"vault_id\":\"{vault_id}\",\"keeper\":{keeper}}}"));
}

pub fn round_committed(vault_id: &str, round: u64, closes_at: u64) {
    emit("round_committed", &format!("{{\"vault_id\":\"{vault_id}\",\"round\":{round},\"closes_at\":{closes_at}}}"));
}

fn hex32(bytes: &[u8; 32]) -> String {
    const HEX: &[u8; 16] = b"0123456789abcdef";
    let mut out = String::with_capacity(64);
    for byte in bytes {
        out.push(HEX[(byte >> 4) as usize] as char);
        out.push(HEX[(byte & 0x0f) as usize] as char);
    }
    out
}
