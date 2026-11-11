//! A sponsor's door spec, version 1. Strict: an unknown field, a wrong type, or a value over a
//! limit is an error with a plain sentence. Amounts are kept in hundredths of a whole unit and
//! converted with the spec's own `decimals`.

use serde_json::{Map, Value};

use crate::clues::{Clues, MAX_PEOPLE, MAX_PERSON, MIN_PEOPLE};

pub const MAX_LINES: usize = 12;
pub const MAX_CHIPS: usize = 6;
pub const MAX_SPEC_BYTES: usize = 8192;
pub const MAX_TEXT_BYTES: usize = 2048;
pub const MIN_DECIMALS: u64 = 2;
pub const MAX_DECIMALS: u64 = 18;
const MAX_VOICE: usize = 600;
const MAX_HINT: usize = 400;
const MAX_HINTS: usize = 6;
const MAX_ASK: usize = 200;
const MAX_REPLY: usize = 400;
const MAX_NAME: usize = 60;
const MAX_PATTERN: usize = 40;
const MAX_QTY: u64 = 1_000_000;
const MAX_WHOLE_DIGITS: usize = 12;

#[derive(Clone, Debug, PartialEq, Eq)]
pub enum Part {
    Lit(String),
    Digits(u8),
    Range(u32, u32),
}

#[derive(Clone, Debug)]
pub struct LineSpec {
    pub payee: String,
    pub reference: Vec<Part>,
    pub item: String,
    pub qty_lo: u64,
    pub qty_hi: u64,
    /// Hundredths of a whole unit.
    pub unit_lo: u128,
    pub unit_hi: u128,
    pub paid: bool,
}

#[derive(Clone, Debug)]
pub struct Chip {
    pub ask: String,
    pub reply: String,
}

#[derive(Clone, Debug)]
pub struct Spec {
    pub decimals: u8,
    pub voice: String,
    pub lines: Vec<LineSpec>,
    pub chips: Vec<Chip>,
    /// Street rumours. A player hears one of them, chosen from that player's own ledger. Empty means none.
    pub hints: Vec<String>,
    /// Plan 85: the bill in pieces across the street. A door uses clues or hints, not both.
    pub clues: Option<Clues>,
}

impl Spec {
    /// Base units for one hundredth of a whole unit.
    pub fn cent(&self) -> u128 {
        10u128.pow(u32::from(self.decimals) - 2)
    }
}

pub fn parse(text: &str) -> Result<Spec, String> {
    if text.len() > MAX_SPEC_BYTES {
        return Err(format!("The spec is larger than {MAX_SPEC_BYTES} bytes."));
    }
    let value: Value = serde_json::from_str(text).map_err(|_| "The spec is not valid JSON.".to_string())?;
    let root = value.as_object().ok_or("The spec must be an object.")?;
    only(root, &["v", "salt", "decimals", "guard", "lines", "chips", "hint", "clues"], "spec")?;
    if root.get("v").and_then(|v| v.as_u64()) != Some(1) {
        return Err("The spec version must be 1.".into());
    }
    let salt = root.get("salt").and_then(|v| v.as_str()).ok_or("The spec needs a salt.")?;
    if salt.len() != 32 || !salt.bytes().all(|b| b.is_ascii_hexdigit()) {
        return Err("The salt must be 32 hex characters.".into());
    }
    let decimals = root.get("decimals").and_then(|v| v.as_u64()).ok_or("The spec needs decimals.")?;
    if !(MIN_DECIMALS..=MAX_DECIMALS).contains(&decimals) {
        return Err(format!("Decimals must be between {MIN_DECIMALS} and {MAX_DECIMALS}."));
    }
    let decimals = decimals as u8;
    let guard = root.get("guard").and_then(|v| v.as_object()).ok_or("The spec needs a guard.")?;
    only(guard, &["voice"], "guard")?;
    let voice = text_field(guard, "voice", MAX_VOICE)?;
    let raw_lines = root.get("lines").and_then(|v| v.as_array()).ok_or("The spec needs lines.")?;
    if raw_lines.is_empty() || raw_lines.len() > MAX_LINES {
        return Err(format!("A spec has 1 to {MAX_LINES} lines."));
    }
    let mut lines = Vec::new();
    for (i, raw) in raw_lines.iter().enumerate() {
        lines.push(parse_line(raw, i + 1, decimals)?);
    }
    let mut chips = Vec::new();
    if let Some(raw) = root.get("chips") {
        let raw = raw.as_array().ok_or("Chips must be a list.")?;
        if raw.len() > MAX_CHIPS {
            return Err(format!("A spec has at most {MAX_CHIPS} chips."));
        }
        for item in raw {
            let item = item.as_object().ok_or("A chip must be an object.")?;
            only(item, &["ask", "reply"], "chip")?;
            chips.push(Chip { ask: text_field(item, "ask", MAX_ASK)?, reply: text_field(item, "reply", MAX_REPLY)? });
        }
    }
    // One sentence, or a short list of them. Each player hears one, so the street is not the same for everyone.
    let hints: Vec<String> = match root.get("hint") {
        None => Vec::new(),
        Some(v) => {
            let raw: Vec<&Value> = match v.as_array() {
                Some(list) => list.iter().collect(),
                None => vec![v],
            };
            if raw.is_empty() || raw.len() > MAX_HINTS {
                return Err(format!("Give 1 to {MAX_HINTS} hints."));
            }
            let mut out = Vec::new();
            for item in raw {
                let hint = item.as_str().ok_or("A hint must be text.")?;
                if hint.is_empty() || hint.len() > MAX_HINT {
                    return Err(format!("A hint is 1 to {MAX_HINT} characters."));
                }
                check_hint(hint)?;
                out.push(hint.to_string());
            }
            out
        }
    };
    let clues = match root.get("clues") {
        None => None,
        Some(raw) => Some(parse_clues(raw, &chips)?),
    };
    if clues.is_some() && !hints.is_empty() {
        return Err("A door uses clues or hints, not both.".into());
    }
    let clue_bytes = clues.as_ref().map_or(0, |c| c.ask.len() + c.people.iter().map(|p| p.len()).sum::<usize>());
    let used = voice.len() + clue_bytes + hints.iter().map(|h| h.len()).sum::<usize>() + chips.iter().map(|c| c.ask.len() + c.reply.len()).sum::<usize>();
    if used > MAX_TEXT_BYTES {
        return Err(format!("The voice, hint, clues, and chips are larger than {MAX_TEXT_BYTES} bytes together."));
    }
    Ok(Spec { decimals, voice, lines, chips, hints, clues })
}

fn parse_clues(raw: &Value, chips: &[Chip]) -> Result<Clues, String> {
    let map = raw.as_object().ok_or("Clues must be an object.")?;
    only(map, &["people", "ask"], "clues")?;
    let ask = text_field(map, "ask", MAX_ASK)?;
    if chips.iter().any(|chip| chip.ask.trim() == ask.trim()) {
        return Err("The clue question is already a chip. Ask something else.".into());
    }
    let raw_people = map.get("people").and_then(|v| v.as_array()).ok_or("Clues need a list of people.")?;
    if raw_people.len() < MIN_PEOPLE || raw_people.len() > MAX_PEOPLE {
        return Err(format!("Clues need {MIN_PEOPLE} to {MAX_PEOPLE} people."));
    }
    let mut people: Vec<String> = Vec::new();
    for item in raw_people {
        let name = item.as_str().ok_or("A person in the clues is a name.")?.trim().to_string();
        if name.is_empty() || name.len() > MAX_PERSON || name.chars().any(|c| c.is_control()) {
            return Err(format!("A person's name is 1 to {MAX_PERSON} characters."));
        }
        if people.iter().any(|p| p.eq_ignore_ascii_case(&name)) {
            return Err("Two people in the clues have the same name.".into());
        }
        people.push(name);
    }
    Ok(Clues { people, ask: ask.trim().to_string() })
}

fn parse_line(raw: &Value, n: usize, decimals: u8) -> Result<LineSpec, String> {
    let line = raw.as_object().ok_or(format!("Line {n} must be an object."))?;
    only(line, &["payee", "reference", "item", "qty", "unit", "paid"], &format!("line {n}"))?;
    let payee = text_field(line, "payee", MAX_NAME).map_err(|e| format!("Line {n}: {e}"))?;
    let item = text_field(line, "item", MAX_NAME).map_err(|e| format!("Line {n}: {e}"))?;
    let reference = parse_pattern(line.get("reference").and_then(|v| v.as_str()).ok_or(format!("Line {n} needs a reference pattern (empty for none)."))?)
        .map_err(|e| format!("Line {n}: {e}"))?;
    let qty = line.get("qty").and_then(|v| v.as_object()).ok_or(format!("Line {n} needs a quantity range."))?;
    only(qty, &["lo", "hi"], "qty")?;
    let qty_lo = qty.get("lo").and_then(|v| v.as_u64()).ok_or(format!("Line {n}: qty lo must be a whole number."))?;
    let qty_hi = qty.get("hi").and_then(|v| v.as_u64()).ok_or(format!("Line {n}: qty hi must be a whole number."))?;
    if qty_lo < 1 || qty_hi < qty_lo || qty_hi > MAX_QTY {
        return Err(format!("Line {n}: quantity must be from 1 to {MAX_QTY}, lo at most hi."));
    }
    let unit = line.get("unit").and_then(|v| v.as_object()).ok_or(format!("Line {n} needs a unit amount range."))?;
    only(unit, &["lo", "hi"], "unit")?;
    let unit_lo = hundredths(unit.get("lo").and_then(|v| v.as_str()).ok_or(format!("Line {n}: unit lo must be a decimal string."))?)
        .map_err(|e| format!("Line {n}: {e}"))?;
    let unit_hi = hundredths(unit.get("hi").and_then(|v| v.as_str()).ok_or(format!("Line {n}: unit hi must be a decimal string."))?)
        .map_err(|e| format!("Line {n}: {e}"))?;
    if unit_hi < unit_lo {
        return Err(format!("Line {n}: unit lo is above unit hi."));
    }
    let paid = line.get("paid").and_then(|v| v.as_bool()).ok_or(format!("Line {n} needs paid true or false."))?;
    let cent = 10u128.pow(u32::from(decimals) - 2);
    unit_hi
        .checked_mul(cent)
        .and_then(|u| u.checked_mul(u128::from(qty_hi)))
        .ok_or(format!("Line {n}: the amount is too large for {decimals} decimals."))?;
    Ok(LineSpec { payee, reference, item, qty_lo, qty_hi, unit_lo, unit_hi, paid })
}

pub fn parse_pattern(text: &str) -> Result<Vec<Part>, String> {
    if text.len() > MAX_PATTERN {
        return Err(format!("A reference pattern is at most {MAX_PATTERN} characters."));
    }
    let mut parts = Vec::new();
    let mut lit = String::new();
    let mut chars = text.chars();
    while let Some(c) = chars.next() {
        match c {
            '{' => {
                let mut token = String::new();
                loop {
                    match chars.next() {
                        Some('}') => break,
                        Some(c) => token.push(c),
                        None => return Err("A reference pattern has an unclosed brace.".into()),
                    }
                }
                if !lit.is_empty() {
                    parts.push(Part::Lit(std::mem::take(&mut lit)));
                }
                parts.push(token_part(&token)?);
            }
            '}' => return Err("A reference pattern has a stray closing brace.".into()),
            c if c.is_ascii_graphic() => lit.push(c),
            _ => return Err("A reference pattern uses printable ASCII, no spaces.".into()),
        }
    }
    if !lit.is_empty() {
        parts.push(Part::Lit(lit));
    }
    Ok(parts)
}

fn token_part(token: &str) -> Result<Part, String> {
    match token {
        "d2" => Ok(Part::Digits(2)),
        "d3" => Ok(Part::Digits(3)),
        "d4" => Ok(Part::Digits(4)),
        _ => {
            let range = token.strip_prefix("n:").ok_or(format!("Unknown reference token {{{token}}}."))?;
            let (lo, hi) = range.split_once('-').ok_or(format!("Unknown reference token {{{token}}}."))?;
            let lo: u32 = lo.parse().map_err(|_| format!("Unknown reference token {{{token}}}."))?;
            let hi: u32 = hi.parse().map_err(|_| format!("Unknown reference token {{{token}}}."))?;
            if hi < lo {
                return Err(format!("The range {{{token}}} runs backwards."));
            }
            Ok(Part::Range(lo, hi))
        }
    }
}

/// How many distinct references the pattern can make.
pub fn reference_space(parts: &[Part]) -> u128 {
    parts.iter().fold(1u128, |space, part| {
        let n = match part {
            Part::Lit(_) => 1,
            Part::Digits(d) => 10u128.pow(u32::from(*d)),
            Part::Range(lo, hi) => u128::from(hi - lo) + 1,
        };
        space.saturating_mul(n)
    })
}

fn hundredths(text: &str) -> Result<u128, String> {
    let (whole, frac) = match text.split_once('.') {
        Some((whole, frac)) => (whole, frac),
        None => (text, ""),
    };
    let ok = !whole.is_empty()
        && whole.len() <= MAX_WHOLE_DIGITS
        && whole.bytes().all(|b| b.is_ascii_digit())
        && frac.len() <= 2
        && frac.bytes().all(|b| b.is_ascii_digit());
    if !ok {
        return Err("An amount is whole units with at most two decimals, like 350 or 350.50.".into());
    }
    let whole: u128 = whole.parse().map_err(|_| "An amount is too large.".to_string())?;
    let frac: u128 = match frac.len() {
        0 => 0,
        1 => frac.parse::<u128>().unwrap_or(0) * 10,
        _ => frac.parse().unwrap_or(0),
    };
    Ok(whole * 100 + frac)
}

fn check_hint(hint: &str) -> Result<(), String> {
    let mut rest = hint;
    while let Some(start) = rest.find('{') {
        let end = rest[start..].find('}').ok_or("The hint has an unclosed brace.")? + start;
        match &rest[start + 1..end] {
            "reference" | "amount" | "payee" | "item" | "ref_head" | "amount_near" => {}
            other => return Err(format!("Unknown hint token {{{other}}}.")),
        }
        rest = &rest[end + 1..];
    }
    Ok(())
}

fn only(map: &Map<String, Value>, allowed: &[&str], what: &str) -> Result<(), String> {
    for key in map.keys() {
        if !allowed.contains(&key.as_str()) {
            return Err(format!("Unknown field {key} in {what}."));
        }
    }
    Ok(())
}

fn text_field(map: &Map<String, Value>, name: &str, max: usize) -> Result<String, String> {
    let text = map.get(name).and_then(|v| v.as_str()).ok_or(format!("{name} must be text."))?;
    if text.trim().is_empty() || text.len() > max {
        return Err(format!("{name} is 1 to {max} characters."));
    }
    if text.chars().any(|c| c.is_control()) {
        return Err(format!("{name} has a control character."));
    }
    Ok(text.to_string())
}
