//! The fairness test. It runs the generator for sample players with a fixed public seed, so it
//! never touches a real ledger and needs no network. Each failure is a plain sentence.

use std::collections::BTreeSet;

use crate::chat::leaks_with;
use crate::ledger::{match_bill_with, money_d, norm, tolerance, Draft, Hit, Line};
use crate::spec::{reference_space, LineSpec, Spec};
use crate::spec_ledger::generate_spec;

const TEST_SEED: [u8; 32] = [0x42; 32];
const PLAYERS: u32 = 64;
const ROUNDS: u64 = 3;
const MIN_REFERENCE_SPACE: u128 = 100;
const MIN_NAME: usize = 4;
/// With at most 5,000 bills a round, a line this wide is hit by a guesser about once in a hundred rounds.
pub const MIN_GUESS_SPACE: u128 = 500_000;

pub struct Report {
    pub failures: Vec<String>,
    pub warnings: Vec<String>,
}

pub fn check(spec: &Spec, spec_hash: &[u8; 32], cap: u128) -> Report {
    let mut failures = BTreeSet::new();
    let mut warnings = Vec::new();
    let tol = tolerance(spec.decimals);

    for (i, line) in spec.lines.iter().enumerate() {
        let n = i + 1;
        if norm(&line.payee).len() < MIN_NAME {
            failures.insert(format!("Line {n}: the payee needs at least {MIN_NAME} letters or digits, or the door cannot match it."));
        }
        if !line.reference.is_empty() && reference_space(&line.reference) < MIN_REFERENCE_SPACE {
            failures.insert(format!("Line {n}: the reference can take fewer than {MIN_REFERENCE_SPACE} values, so a player could guess it."));
        }
        if !line.paid && line.unit_hi == 0 {
            failures.insert(format!("Line {n}: an unpaid line with a zero amount pays nothing."));
        }
        if !line.paid {
            let space = guess_space(line);
            if space < MIN_GUESS_SPACE {
                failures.insert(format!(
                    "Line {n}: a guesser has about 1 chance in {space} of hitting this line. Give it more reference digits or a wider amount range."
                ));
            }
        }
    }
    if spec.clues.is_some() {
        // Plan 85: paid lines are where the look-alike pieces come from, so the player has to tell lines apart.
        if !spec.lines.iter().any(|line| line.paid) {
            failures.insert("Clues need at least one paid line, so the street mixes in pieces that do not belong to the unpaid bill.".to_string());
        }
        let mut items = BTreeSet::new();
        for line in &spec.lines {
            if !items.insert(norm(&line.item)) {
                failures.insert(format!("Two lines are both \"{}\". With clues, each line needs its own item, because pieces name the item.", line.item));
            }
        }
    } else if !spec.lines.iter().any(|line| line.paid) {
        warnings.push("No line is already paid, so a guesser could win by luck. Add a paid line as a trap.".to_string());
    }
    if spec.hints.is_empty() && spec.clues.is_none() {
        warnings.push("There is no hint, so players hear no payable bill on the street.".to_string());
    }
    for hint in &spec.hints {
        let whole = hint.contains("{payee}") && hint.contains("{reference}") && hint.contains("{amount}");
        if whole {
            failures.insert(format!("The hint \"{hint}\" hands players the whole bill. Use {{ref_head}}, {{amount_near}} or {{item}} to give a clue instead."));
        }
    }

    for player in 0..PLAYERS {
        for round in 1..=ROUNDS {
            let lines = generate_spec(spec, &TEST_SEED, spec_hash, "check", round, &format!("sample-{player}"));
            check_ledger(spec, &lines, cap, tol, &mut failures);
            if let Some(clues) = &spec.clues {
                check_clues(clues, &lines, &mut failures);
            }
            for chip in &spec.chips {
                if leaks_with(&chip.reply, &lines, spec.decimals) {
                    failures.insert(format!("The chip reply \"{}\" repeats a ledger payee, reference, or amount.", chip.reply));
                }
            }
        }
    }
    Report { failures: failures.into_iter().collect(), warnings }
}

fn check_ledger(spec: &Spec, lines: &[Line], cap: u128, tol: u128, failures: &mut BTreeSet<String>) {
    let mut payable = false;
    let mut seen = BTreeSet::new();
    for (i, line) in lines.iter().enumerate() {
        let n = i + 1;
        if !line.reference.is_empty() && !seen.insert(norm(&line.reference)) {
            failures.insert(format!("Line {n}: two lines in one ledger can get the same reference."));
        }
        if line.paid {
            continue;
        }
        if line.total > cap {
            // One sentence per line, naming the most it can reach, not one per sampled amount.
            let top = spec.lines.get(i).map_or(line.total, |l| u128::from(l.qty_hi) * l.unit_hi * spec.cent());
            failures.insert(format!(
                "Line {n}: can reach {}, above the cap of {}, so some players could not be paid.",
                money_d(top, spec.decimals),
                money_d(cap, spec.decimals)
            ));
        } else if line.total > 0 {
            payable = true;
        }
        let honest = Draft {
            payee: line.payee.clone(),
            reference: line.reference.clone(),
            item: line.item.clone(),
            qty: line.qty,
            unit: line.unit,
        };
        match match_bill_with(&honest, lines, tol) {
            Hit::One(found) if found.payee == line.payee && found.total == line.total => {}
            Hit::Many => {
                failures.insert(format!("Line {n}: its honest bill also matches another line, so it can never be approved."));
            }
            _ => {
                failures.insert(format!("Line {n}: its honest bill is not approved."));
            }
        }
    }
    if !payable {
        failures.insert("Some players would get a ledger with no bill the pot can pay.".to_string());
    }
}

/// How many (reference, total) pairs a guesser must choose between for one unpaid line. The payee is
/// known from the street. A line with no reference counts one reference. When the ranges are too wide to
/// list, the count of totals is a lower bound, so the space is never overstated.
pub fn guess_space(line: &LineSpec) -> u128 {
    let qty = u128::from(line.qty_hi - line.qty_lo) + 1;
    let unit = line.unit_hi - line.unit_lo + 1;
    let totals = if qty.saturating_mul(unit) <= 1_000_000 {
        let mut all = BTreeSet::new();
        for q in line.qty_lo..=line.qty_hi {
            for u in line.unit_lo..=line.unit_hi {
                all.insert(u128::from(q) * u);
            }
        }
        all.len() as u128
    } else {
        unit.max(qty)
    };
    totals.saturating_mul(reference_space(&line.reference))
}

/// Plan 85, for one sampled ledger: the pieces add up to the unpaid bill, and nobody on the street holds all of it.
pub(crate) fn check_clues(clues: &crate::clues::Clues, lines: &[Line], failures: &mut BTreeSet<String>) {
    let Some(line) = crate::clues::target(lines) else {
        failures.insert("Some players would have no unpaid line with a reference of at least 2 characters, so their clues would be empty.".to_string());
        return;
    };
    let (first, last) = crate::clues::halves(&line.reference);
    for person in crate::clues::queue(clues, lines) {
        let said: String = person["lines"].as_array().into_iter().flatten().filter_map(|l| l["text"].as_str()).collect::<Vec<_>>().join(" ");
        // The target's own two sentences, so a paid line's look-alike ending never counts as a second half.
        let starts = format!("The {} invoice number starts {first}.", line.payee);
        let ended = format!("The {} invoice ended {last}.", line.item);
        if said.contains(&starts) && said.contains(&ended) {
            failures.insert("One person in the street would hold both halves of a reference. Add another person to the clues.".to_string());
        }
    }
}
