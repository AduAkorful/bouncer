//! Turn a vault view and a block read into the door the reveal check uses.
//! A missing field, an error string, or a clock that is not in the block is a failure.

use serde_json::Value;

use crate::host::DoorView;

pub fn door_from_reports(
    view_ok: &str,
    view_err: &str,
    block_ok: &str,
    block_err: &str,
) -> Result<DoorView, ()> {
    if !view_err.is_empty() || !block_err.is_empty() || view_ok.is_empty() || block_ok.is_empty() {
        return Err(());
    }
    let (open, closes_at) = vault_fields(view_ok)?;
    let now = block_now(block_ok)?;
    Ok(DoorView { open, closes_at, now })
}

fn vault_fields(text: &str) -> Result<(bool, u64), ()> {
    let value: Value = serde_json::from_str(text).map_err(|_| ())?;
    if value.is_null() {
        return Err(());
    }
    if let Some(pair) = fields_of(&value) {
        return Ok(pair);
    }
    let inner = decode_bytes(&value).ok_or(())?;
    fields_of(&inner).ok_or(())
}

fn fields_of(value: &Value) -> Option<(bool, u64)> {
    let open = value.get("open")?.as_bool()?;
    let closes_at = as_u64(value.get("closes_at")?)?;
    Some((open, closes_at))
}

fn decode_bytes(value: &Value) -> Option<Value> {
    let array = value
        .pointer("/result/result")
        .filter(|v| v.is_array())
        .or_else(|| value.get("result").filter(|v| v.is_array()))?;
    let raw = array.as_array()?.iter().map(as_byte).collect::<Option<Vec<u8>>>()?;
    serde_json::from_slice(&raw).ok()
}

fn block_now(text: &str) -> Result<u64, ()> {
    let value: Value = serde_json::from_str(text).map_err(|_| ())?;
    for pointer in [
        "/header/timestamp_nanosec",
        "/result/header/timestamp_nanosec",
        "/header/timestamp",
        "/result/header/timestamp",
    ] {
        if let Some(now) = value.pointer(pointer).and_then(as_u64) {
            return Ok(now);
        }
    }
    Err(())
}

fn as_u64(value: &Value) -> Option<u64> {
    value.as_u64().or_else(|| value.as_str().and_then(|text| text.parse().ok()))
}

fn as_byte(value: &Value) -> Option<u8> {
    value.as_u64().filter(|n| *n <= 255).map(|n| n as u8)
}
