use near_sdk::env;

pub fn guard_key_set(vault_id: &str, round: u64, guard_pk: &[u8; 32]) {
    env::log_str(&format!(
        "{{\"standard\":\"bouncer\",\"version\":\"1.0.0\",\"event\":\"guard_key_set\",\"data\":{{\"vault_id\":\"{vault_id}\",\"round\":{round},\"guard_pk\":\"{}\"}}}}",
        hex32(guard_pk)
    ));
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
