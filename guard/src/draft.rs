//! The prompt for a model-drafted spec. The answer is untrusted text. It is parsed by the strict
//! spec parser and then edited and tested by the sponsor. It never reaches a payout on its own.

pub const MAX_STORY: usize = 2000;

pub const DRAFT_SYSTEM: &str = "\
You turn a short description of a place that owes bills into a JSON door spec. Reply with one JSON object and nothing else. \
Fields: guard.voice (how the door guard speaks, at most 600 characters); lines (3 to 8 claimant types); \
chips (up to 4 of {ask, reply}); hint (optional, one sentence using {payee}, {reference}, {amount}). \
Each line has payee (4 or more letters), reference (a pattern: letters, digits, dashes, and tokens {d2} {d3} {d4} or {n:LO-HI}; the reference must be able to take at least 100 values), \
item, qty {lo, hi}, unit {lo, hi} as strings in whole units with at most two decimals, and paid (true or false). \
Include at least one paid true line as a trap, and make every unpaid amount small enough to be paid. \
A chip reply must never repeat a payee, a reference, or an amount. Do not include v, salt, or decimals. \
Example line: {\"payee\":\"Coastline Drinks\",\"reference\":\"CD-{d4}\",\"item\":\"bar delivery\",\"qty\":{\"lo\":1,\"hi\":1},\"unit\":{\"lo\":\"40\",\"hi\":\"120\"},\"paid\":false}";

/// The first object in the model's text, in case it wrapped the JSON in a sentence or a fence.
pub fn extract_object(text: &str) -> Option<&str> {
    let start = text.find('{')?;
    let end = text.rfind('}')?;
    (end > start).then(|| &text[start..=end])
}
