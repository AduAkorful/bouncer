//! The ledger a spec describes, for one player in one round. A different seed, vault, round,
//! player, or spec gives a different ledger. The built-in doors keep `bouncer.ledger.v1`.

use sha2::{Digest, Sha256};

use crate::ledger::{hmac, Line, Stream};
use crate::spec::{Part, Spec};

const LEDGER_DOMAIN: &[u8] = b"bouncer.ledger.v2";
const GUARD_DOMAIN: &[u8] = b"bouncer.guard.v2";

pub fn generate_spec(spec: &Spec, seed: &[u8; 32], spec_hash: &[u8; 32], vault_id: &str, round: u64, player_id: &str) -> Vec<Line> {
    let mut msg = LEDGER_DOMAIN.to_vec();
    msg.push(0);
    msg.extend(vault_id.as_bytes());
    msg.push(0);
    msg.extend(round.to_le_bytes());
    msg.push(0);
    msg.extend(player_id.as_bytes());
    msg.push(0);
    msg.extend(spec_hash);
    let mut stream = Stream::new(seed, hmac(seed, &msg));
    let cent = spec.cent();
    spec.lines
        .iter()
        .map(|line| {
            let reference = render(&line.reference, &mut stream);
            let qty = pick(&mut stream, u128::from(line.qty_lo), u128::from(line.qty_hi));
            let unit = pick(&mut stream, line.unit_lo, line.unit_hi) * cent;
            Line {
                payee: line.payee.clone(),
                reference,
                item: line.item.clone(),
                qty,
                unit,
                total: qty * unit,
                paid: line.paid,
            }
        })
        .collect()
}

fn pick(stream: &mut Stream<'_>, lo: u128, hi: u128) -> u128 {
    lo + u128::from(stream.u64()) % (hi - lo + 1)
}

fn render(parts: &[Part], stream: &mut Stream<'_>) -> String {
    let mut out = String::new();
    for part in parts {
        match part {
            Part::Lit(text) => out.push_str(text),
            Part::Digits(n) => {
                for _ in 0..*n {
                    out.push(char::from(b'0' + stream.byte_below(10)));
                }
            }
            Part::Range(lo, hi) => out.push_str(&pick(stream, u128::from(*lo), u128::from(*hi)).to_string()),
        }
    }
    out
}

/// The 32 bytes a round stores as `guard_version` for a custom story. The spec hash rides in it,
/// so a verdict made under another spec is refused by the vault.
pub fn spec_guard_version(generator: &[u8; 32], spec_hash: &[u8; 32]) -> [u8; 32] {
    let mut hasher = Sha256::new();
    hasher.update(GUARD_DOMAIN);
    hasher.update(generator);
    hasher.update(spec_hash);
    hasher.finalize().into()
}

/// `SHA-256(generator || seed || spec_hash)`.
pub fn spec_commitment(generator: &[u8; 32], seed: &[u8; 32], spec_hash: &[u8; 32]) -> [u8; 32] {
    let mut hasher = Sha256::new();
    hasher.update(generator);
    hasher.update(seed);
    hasher.update(spec_hash);
    hasher.finalize().into()
}
