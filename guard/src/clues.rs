//! Plan 85. A door with `clues` gives each player their own unpaid bill in pieces, spread over the
//! street, mixed with pieces of paid lines and one stale reference. No one person holds the whole
//! bill, and the unit price is only in the guard's answer to the door's clue question, which costs a
//! message. The text is the guard's, not the sponsor's, so the fairness checks hold by construction.

use serde_json::{json, Value};
use sha2::{Digest, Sha256};

use crate::ledger::{money_d, Line};
use crate::spec::Chip;

pub const MIN_PEOPLE: usize = 2;
pub const MAX_PEOPLE: usize = 6;
pub const MAX_PERSON: usize = 40;

#[derive(Clone, Debug)]
pub struct Clues {
    /// Who stands in the queue. Each holds one or more pieces.
    pub people: Vec<String>,
    /// The question whose answer is the unit price. Asking it costs a message.
    pub ask: String,
}

/// The line a player's clues describe: their first unpaid line with a reference.
pub fn target(lines: &[Line]) -> Option<&Line> {
    lines.iter().find(|line| !line.paid && line.reference.chars().count() >= 2)
}

/// The two halves of a reference. Each half alone leaves the other to find. The cut falls in the middle of the
/// digits, so both halves carry some: `HIC-2806` is `HIC-28` and `06`, not `HIC-` and every digit at once.
pub fn halves(reference: &str) -> (String, String) {
    let chars: Vec<char> = reference.chars().collect();
    let digits: Vec<usize> = chars.iter().enumerate().filter(|(_, c)| c.is_ascii_digit()).map(|(i, _)| i).collect();
    let cut = if digits.len() >= 2 { digits[digits.len() / 2] } else { chars.len().div_ceil(2) };
    (chars[..cut].iter().collect(), chars[cut..].iter().collect())
}

/// An out-of-date reference for the same payee: the same shape with new digits. The digits come from a hash
/// of the reference, so they are stable for a player but say nothing about the real ones; a fixed shift would
/// hand the whole reference to anyone who noticed it. None when it has no digits.
pub fn stale(reference: &str) -> Option<String> {
    if !reference.chars().any(|c| c.is_ascii_digit()) {
        return None;
    }
    let mut seed = 0u32;
    loop {
        let digest = Sha256::new().chain_update(b"bouncer.stale.v1").chain_update(seed.to_le_bytes()).chain_update(reference.as_bytes()).finalize();
        let mut bytes = digest.iter();
        let old: String = reference.chars().map(|c| if c.is_ascii_digit() { char::from(b'0' + bytes.next().map_or(0, |b| b % 10)) } else { c }).collect();
        if old != reference {
            return Some(old);
        }
        seed += 1;
    }
}

/// The answer to the clue question, filled from this player's own ledger.
pub fn chip(clues: &Clues, lines: &[Line], decimals: u8) -> Option<Chip> {
    let line = target(lines)?;
    Some(Chip { ask: clues.ask.clone(), reply: format!("The rate for {} is {} a unit tonight.", line.item, money_d(line.unit, decimals)) })
}

fn mix(line: &Line) -> usize {
    line.reference.bytes().chain(line.payee.bytes()).fold(0usize, |h, b| h.wrapping_mul(31).wrapping_add(b as usize))
}

/// What a piece says, so the queue can keep pieces that add up to the reference apart.
#[derive(Clone, Copy, PartialEq, Eq)]
enum Kind {
    First,
    Stale,
    Other,
}

/// Every piece a player can overhear, in the order they are handed to people.
fn pieces(lines: &[Line]) -> Vec<(Kind, String)> {
    let Some(line) = target(lines) else { return Vec::new() };
    let (first, last) = halves(&line.reference);
    let mut out = vec![
        (Kind::Other, format!("{} brought the {} and still hasn't been paid for it.", line.payee, line.item)),
        (Kind::First, format!("The {} invoice number starts {first}.", line.payee)),
        (Kind::Other, format!("The {} invoice ended {last}. I saw it on the bar.", line.item)),
        (Kind::Other, format!("{} × {} on tonight's order.", line.qty, line.item)),
        (Kind::Other, format!("Ask the guard the rate for {}. The guard knows it.", line.item)),
    ];
    if let Some(old) = stale(&line.reference) {
        out.push((Kind::Stale, format!("{}'s invoice was {old}, last I saw.", line.payee)));
        out.push((Kind::Other, format!("{} sent out new invoices this week. New numbers on all of them.", line.payee)));
    }
    for paid in lines.iter().filter(|other| other.paid).take(2) {
        out.push((Kind::Other, format!("{} got paid this week. Showed everyone.", paid.payee)));
        if paid.reference.chars().count() >= 2 {
            out.push((Kind::Other, format!("The {} invoice ended {}.", paid.item, halves(&paid.reference).1)));
        }
    }
    out
}

/// The street queue for a clue door. The target's pieces go to different people in turn, so the two halves
/// of the reference never sit with one person; which person starts turns with the player's own line.
pub fn queue(clues: &Clues, lines: &[Line]) -> Vec<Value> {
    let all = pieces(lines);
    let n = clues.people.len();
    if all.is_empty() || n == 0 {
        return Vec::new();
    }
    let start = target(lines).map_or(0, mix) % n;
    let mut seats: Vec<usize> = (0..all.len()).map(|i| (start + i) % n).collect();
    // The out-of-date reference never sits with the first half, so no one person's lines look like a whole number.
    let first = all.iter().position(|(kind, _)| *kind == Kind::First);
    if let (Some(first), Some(old)) = (first, all.iter().position(|(kind, _)| *kind == Kind::Stale)) {
        if seats[old] == seats[first] {
            seats[old] = (seats[old] + 1) % n;
        }
    }
    let mut held: Vec<Vec<Value>> = vec![Vec::new(); n];
    for ((_, text), who) in all.into_iter().zip(seats) {
        let note = format!("{text} ({})", clues.people[who]);
        held[who].push(json!({"text": text, "note": note}));
    }
    clues
        .people
        .iter()
        .zip(held)
        .filter(|(_, lines)| !lines.is_empty())
        .map(|(who, lines)| json!({"who": who, "lines": lines}))
        .collect()
}
