//! The rules one call plays by: the player's ledger, the amount slack, the system text, the chips,
//! and the `guard_version` a verdict carries. A built-in venue is Rust. A custom story is a spec
//! the guard opens from the `spec_ct` the call carries.

use serde_json::Value;
use sha2::{Digest, Sha256};

use crate::chat::{chip_reply, custom_system, SYSTEM};
use crate::host::Host;
use crate::ledger::{generate, tolerance, Line, Venue};
use crate::session::Session;
use crate::spec::{parse, Chip, Spec};
use crate::spec_ledger::{generate_spec, spec_guard_version};
use crate::verdict::GENERATOR;

pub const BUILTIN_DECIMALS: u8 = 6;

pub struct Rules {
    pub lines: Vec<Line>,
    pub decimals: u8,
    pub system: String,
    pub tolerance: u128,
    pub guard_version: [u8; 32],
    chips: Option<Vec<Chip>>,
}

impl Rules {
    pub fn chip(&self, text: &str) -> Option<String> {
        let trimmed = text.trim();
        match &self.chips {
            None => chip_reply(text).map(str::to_string),
            Some(chips) => chips.iter().find(|chip| chip.ask == trimmed).map(|chip| chip.reply.clone()),
        }
    }
}

pub fn builtin(host_seed: &[u8; 32], session: &Session, venue: Venue) -> Rules {
    Rules {
        lines: generate(host_seed, &session.vault_id, session.round, &session.player_id, venue),
        decimals: BUILTIN_DECIMALS,
        system: SYSTEM.to_string(),
        tolerance: tolerance(BUILTIN_DECIMALS),
        guard_version: GENERATOR,
        chips: None,
    }
}

pub fn custom(seed: &[u8; 32], spec: &Spec, spec_hash: &[u8; 32], vault_id: &str, round: u64, player_id: &str) -> Rules {
    Rules {
        lines: generate_spec(spec, seed, spec_hash, vault_id, round, player_id),
        decimals: spec.decimals,
        system: custom_system(&spec.voice),
        tolerance: tolerance(spec.decimals),
        guard_version: spec_guard_version(&GENERATOR, spec_hash),
        chips: Some(spec.chips.clone()),
    }
}

/// Open the `spec_ct` a call carries. It must open under this vault's id, which is its `aad`.
pub fn open_spec<M, S, C, R, B>(host: &Host<M, S, C, R, B>, vault_id: &str, value: &Value) -> Result<(Spec, [u8; 32]), &'static str> {
    let text = value.get("spec_ct").and_then(|v| v.as_str()).ok_or("bad spec")?;
    let bytes = hex::decode(text).map_err(|_| "bad spec")?;
    let plain = host.sealer.open(vault_id.as_bytes(), &bytes).map_err(|_| "bad spec")?;
    let spec = parse(std::str::from_utf8(&plain).map_err(|_| "bad spec")?).map_err(|_| "bad spec")?;
    Ok((spec, Sha256::digest(&plain).into()))
}

pub fn for_session<M, S, C, R, B>(host: &Host<M, S, C, R, B>, session: &Session, value: &Value) -> Result<Rules, &'static str> {
    match session.spec_hash {
        None => Ok(builtin(&host.seed, session, session.venue()?)),
        Some(expected) => {
            let (spec, hash) = open_spec(host, &session.vault_id, value)?;
            if hash != expected {
                return Err("bad spec");
            }
            Ok(custom(&host.seed, &spec, &hash, &session.vault_id, session.round, &session.player_id))
        }
    }
}
