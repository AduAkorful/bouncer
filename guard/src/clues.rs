//! Plan 85. A door with `clues` gives each player their own unpaid bill in pieces, spread over the
//! street, mixed with pieces of paid lines and one stale reference. No one person holds the whole
//! bill, and the unit price is only in the guard's answer to the door's clue question, which costs a
//! message. The text is the guard's, not the sponsor's, so the fairness checks hold by construction.

use serde_json::{json, Value};

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

/// An out-of-date reference for the same payee: every digit moved by five. None when it has no digits.
pub fn stale(reference: &str) -> Option<String> {
    if !reference.chars().any(|c| c.is_ascii_digit()) {
        return None;
    }
    Some(reference.chars().map(|c| c.to_digit(10).map_or(c, |d| char::from(b'0' + ((d + 5) % 10) as u8))).collect())
}

/// The answer to the clue question, filled from this player's own ledger.
pub fn chip(clues: &Clues, lines: &[Line], decimals: u8) -> Option<Chip> {
    let line = target(lines)?;
    Some(Chip { ask: clues.ask.clone(), reply: format!("{} goes for {} a unit tonight.", line.item, money_d(line.unit, decimals)) })
}

fn mix(line: &Line) -> usize {
    line.reference.bytes().chain(line.payee.bytes()).fold(0usize, |h, b| h.wrapping_mul(31).wrapping_add(b as usize))
}

/// Every piece a player can overhear, in the order they are handed to people.
pub fn pieces(lines: &[Line]) -> Vec<String> {
    let Some(line) = target(lines) else { return Vec::new() };
    let (first, last) = halves(&line.reference);
    let mut out = vec![
        format!("{} brought the {} and still hasn't been paid for it.", line.payee, line.item),
        format!("The {} invoice number starts {first}.", line.payee),
        format!("The {} invoice ended {last}. I saw it on the bar.", line.item),
        format!("{} × {} on tonight's order.", line.qty, line.item),
        format!("Ask the guard what {} goes for. He knows the rate.", line.item),
    ];
    if let Some(old) = stale(&line.reference) {
        out.push(format!("{}'s invoice was {old}, last I saw.", line.payee));
        out.push(format!("{} sent out new invoices this week. New numbers on all of them.", line.payee));
    }
    for paid in lines.iter().filter(|other| other.paid).take(2) {
        out.push(format!("{} got paid this week. Showed everyone.", paid.payee));
        if paid.reference.chars().count() >= 2 {
            out.push(format!("The {} invoice ended {}.", paid.item, halves(&paid.reference).1));
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
    let mut held: Vec<Vec<Value>> = vec![Vec::new(); n];
    for (i, text) in all.into_iter().enumerate() {
        let who = (start + i) % n;
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
