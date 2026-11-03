use serde_json::{json, Value};

use crate::ledger::{generate, money, Line, Venue};

const PAYABLE: u128 = 20_000_000;

/// What a player can overhear after they join this raid. Not a ledger, and not for a landing page.
pub fn street(seed: &[u8; 32], vault_id: &str, round: u64, player_id: &str, venue: Venue) -> Value {
    let lines = generate(seed, vault_id, round, player_id, venue);
    let payees: Vec<&str> = lines.iter().map(|line| line.payee.as_str()).collect();
    let payable = lines.iter().find(|line| !line.paid && line.total <= PAYABLE && !line.reference.is_empty());
    json!({
        "payees": payees,
        "poster": ["FRI · LADIES NIGHT", "SAT · K-NOVA", "HEADLINE 23:00 – 02:00"],
        "queue": queue(venue, payable),
    })
}

fn queue(venue: Venue, payable: Option<&Line>) -> Vec<Value> {
    if venue != Venue::Velvet {
        return Vec::new();
    }
    let heard = match payable {
        Some(line) => json!({
            "text": format!(
                "They cancelled a table. Booking {}, refund {}, payee {}.",
                line.reference,
                money(line.total),
                line.payee
            ),
            "note": format!("{} · {} · cancelled table · {}", line.payee, line.reference, money(line.total)),
        }),
        None => json!({
            "text": "Nothing small is still open tonight. The big invoices will not clear.",
            "note": "No small unpaid bill overheard (green dress)",
        }),
    };
    vec![
        json!({
            "who": "Yellow shirt",
            "lines": [
                {"text": "K-Nova's headlining again Saturday. Poster's up by the bar.", "note": "K-Nova headlines Saturday (yellow shirt)"},
                {"text": "Booking refs at this place just go up every week. Lazy.", "note": "Booking refs go up every week (yellow shirt)"}
            ]
        }),
        json!({
            "who": "Red dress",
            "lines": [
                {"text": "Sam's paying K-Nova five hundred a set now, I heard.", "note": "K-Nova paid 500 a set? (red dress)"},
                {"text": "Golden Hour says the door did about two thousand on Saturday.", "note": "Saturday door about 2000? (red dress)"}
            ]
        }),
        json!({
            "who": "Red cap",
            "lines": [
                {"text": "Tunde got paid early tonight. Been showing everyone his phone.", "note": "Tunde already paid tonight? (red cap)"},
                {"text": "Bouncers here never say why they refuse. Don't bother asking.", "note": "Refusals give no reason (red cap)"}
            ]
        }),
        json!({
            "who": "Green dress",
            "lines": [
                heard,
                {"text": "Coastline sent out new invoices this week. New bank details, new numbers.", "note": "Coastline: new invoices (green dress)"},
                {"text": "My cousin works the bar. Coastline's order is never a round number.", "note": "Coastline totals aren't round (green dress)"}
            ]
        }),
        json!({
            "who": "Suya",
            "lines": [
                {"text": "I sell food. I don't see the books.", "note": "Suya stand doesn't see the books"}
            ]
        }),
        json!({
            "who": "Taxi",
            "lines": [
                {"text": "The door closes at midnight. After that, nobody's getting paid tonight.", "note": "Door closes at midnight (taxi)"}
            ]
        }),
        json!({
            "who": "Water",
            "lines": [
                {"text": "Water's free. The list isn't.", "note": "The list isn't public (water seller)"}
            ]
        }),
    ]
}
