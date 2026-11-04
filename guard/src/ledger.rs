use borsh::BorshSerialize;
use hmac::{Hmac, Mac};
use sha2::Sha256;

type HmacSha256 = Hmac<Sha256>;

/// Scripted Builders door. Proposal 15 is the paid line.
pub const DEMO_BUILDERS: &str = "builders-demo";

const TOLERANCE: u128 = 5_000;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Venue {
    Velvet,
    Lions,
    Builders,
    Cuts,
}

impl Venue {
    pub fn parse(value: &str) -> Option<Self> {
        match value {
            "velvet" => Some(Self::Velvet),
            "lions" => Some(Self::Lions),
            "builders" => Some(Self::Builders),
            "cuts" => Some(Self::Cuts),
            _ => None,
        }
    }

    pub fn as_str(self) -> &'static str {
        match self {
            Self::Velvet => "velvet",
            Self::Lions => "lions",
            Self::Builders => "builders",
            Self::Cuts => "cuts",
        }
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Rule {
    PayTheBill,
    SplitTheDay,
}

impl Rule {
    pub fn parse(value: &str) -> Option<Self> {
        match value {
            "pay-the-bill" => Some(Self::PayTheBill),
            "split-the-day" => Some(Self::SplitTheDay),
            _ => None,
        }
    }

    pub fn as_str(self) -> &'static str {
        match self {
            Self::PayTheBill => "pay-the-bill",
            Self::SplitTheDay => "split-the-day",
        }
    }

    pub fn tag(self) -> u8 {
        match self {
            Self::PayTheBill => 1,
            Self::SplitTheDay => 2,
        }
    }

    pub fn from_tag(tag: u8) -> Option<Self> {
        match tag {
            1 => Some(Self::PayTheBill),
            2 => Some(Self::SplitTheDay),
            _ => None,
        }
    }
}

#[derive(Clone, Debug, PartialEq, Eq, BorshSerialize)]
pub struct Line {
    pub payee: String,
    pub reference: String,
    pub item: String,
    pub qty: u128,
    pub unit: u128,
    pub total: u128,
    pub paid: bool,
}

#[derive(Clone, Debug)]
pub struct Draft {
    pub payee: String,
    pub reference: String,
    pub item: String,
    pub qty: u128,
    pub unit: u128,
}

pub enum Hit {
    One(Line),
    None,
    Many,
}

pub fn generate(seed: &[u8; 32], vault_id: &str, round: u64, player_id: &str, venue: Venue) -> Vec<Line> {
    let mac = hmac(seed, &mac_message(vault_id, round, player_id, venue));
    let mut stream = Stream::new(seed, mac);
    let mut lines = match venue {
        Venue::Velvet => velvet(seed, vault_id, round, player_id, &mut stream),
        Venue::Lions => lions(&mut stream),
        Venue::Builders => builders(vault_id, &mut stream),
        Venue::Cuts => cuts(&mut stream),
    };
    for line in &mut lines {
        if line.reference == "INV-2210" {
            line.reference = "INV-2211".into();
        }
    }
    lines
}

pub fn match_bill(draft: &Draft, lines: &[Line]) -> Hit {
    match_bill_with(draft, lines, TOLERANCE)
}

/// Rounding slack for a token with `decimals`: half a cent. Two decimals means exact.
pub fn tolerance(decimals: u8) -> u128 {
    if decimals < 3 {
        0
    } else {
        5 * 10u128.pow(u32::from(decimals) - 3)
    }
}

pub fn match_bill_with(draft: &Draft, lines: &[Line], tolerance: u128) -> Hit {
    let Some(total) = draft.qty.checked_mul(draft.unit) else {
        return Hit::None;
    };
    let mut found = None;
    for line in lines {
        if line.paid || !same_name(&draft.payee, &line.payee) {
            continue;
        }
        if !line.reference.is_empty() && norm(&draft.reference) != norm(&line.reference) {
            continue;
        }
        if total.abs_diff(line.total) > tolerance {
            continue;
        }
        if found.is_some() {
            return Hit::Many;
        }
        found = Some(line.clone());
    }
    match found {
        Some(line) => Hit::One(line),
        None => Hit::None,
    }
}

pub fn norm(value: &str) -> String {
    value.chars().filter(|c| c.is_ascii_alphanumeric()).map(|c| c.to_ascii_lowercase()).collect()
}

pub fn money(total: u128) -> String {
    money_d(total, 6)
}

pub fn money_d(total: u128, decimals: u8) -> String {
    let unit = 10u128.pow(u32::from(decimals));
    let cents = (total % unit) / 10u128.pow(u32::from(decimals) - 2);
    format!("{}.{cents:02}", total / unit)
}

fn same_name(a: &str, b: &str) -> bool {
    let x = norm(a);
    let y = norm(b);
    x.len() >= 4 && y.len() >= 4 && (x == y || x.contains(&y) || y.contains(&x))
}

fn velvet(seed: &[u8; 32], vault_id: &str, round: u64, player_id: &str, stream: &mut Stream<'_>) -> Vec<Line> {
    let booking = k_nova_booking(seed, vault_id, player_id, round);
    let gh = 10 + u32::from(stream.byte() % 90);
    let door = 1500 + u32::from(stream.u16() % 1000);
    let table_n = 10 + u32::from(stream.byte() % 90);
    let _table_roll = stream.byte();
    let shifts = 1 + u32::from(stream.byte() % 3);
    let cd = 1000 + u32::from(stream.u16() % 8000);
    let cents = u32::from(stream.byte() % 100);
    let coast = 286 * 1_000_000 + u128::from(cents) * 10_000;
    vec![
        fixed("DJ K-Nova", &format!("VLV-B-{booking:03}"), "Saturday set", usdc(350), false),
        fixed("Golden Hour Promotions", &format!("GH-{gh}"), "door share", u128::from(door) * 100_000, false),
        fixed("Table deposit refund", &format!("T-{table_n}"), "cancelled table", usdc(10), false),
        fixed("Tunde", "", "security shifts", usdc(u64::from(shifts) * 60), false),
        fixed("Coastline Drinks", &format!("CD-{cd}"), "bar delivery", coast, false),
    ]
}

fn k_nova_booking(seed: &[u8; 32], vault_id: &str, player_id: &str, round: u64) -> u64 {
    let mut msg = b"bouncer.ledger.player.v1".to_vec();
    msg.push(0);
    msg.extend(vault_id.as_bytes());
    msg.push(0);
    msg.extend(player_id.as_bytes());
    let base = 90 + u64::from(hmac(seed, &msg)[0] % 20);
    base + round.saturating_mul(7)
}

fn lions(stream: &mut Stream<'_>) -> Vec<Line> {
    let goals = 1 + u128::from(stream.byte() % 3);
    let tr = 1 + u32::from(stream.u16() % 9_999);
    let kl = 1 + u32::from(stream.u16() % 9_999);
    vec![
        Line {
            payee: "Mensah".into(),
            reference: String::new(),
            item: "goal bonus".into(),
            qty: goals,
            unit: usdc(50),
            total: goals * usdc(50),
            paid: false,
        },
        fixed("Mensah Sports Agency", &format!("TR-{tr:04}"), "transfer instalment", usdc(500), false),
        fixed("Kitline", &format!("KL-{kl}"), "kit invoice", usdc(180), false),
    ]
}

fn builders(vault_id: &str, stream: &mut Stream<'_>) -> Vec<Line> {
    let payees = ["Osu Youth Pitch", "Coastal Cement", "Block Shop"];
    let (numbers, paid_at) = if vault_id == DEMO_BUILDERS {
        ([14u32, 15, 16], 1usize)
    } else {
        let start = 10 + u32::from(stream.byte() % 40);
        let paid_at = usize::from(stream.byte() % 3);
        ([start, start + 1, start + 2], paid_at)
    };
    numbers
        .into_iter()
        .enumerate()
        .map(|(i, n)| {
            let paid = i == paid_at;
            let amount = if paid { 400 } else { 100 + u64::from(stream.u16() % 400) };
            fixed(payees[i], &format!("GB-{n}"), &format!("proposal {n}"), usdc(amount), paid)
        })
        .collect()
}

fn cuts(stream: &mut Stream<'_>) -> Vec<Line> {
    let rows = [
        ("Kofi Clippers", "blades", inv_suffix(stream)),
        ("Towel House", "towels", format!("TW-{}", 10 + u32::from(stream.byte() % 90))),
        ("NEPA Desk", "power", format!("NP-{}", 10 + u32::from(stream.byte() % 90))),
    ];
    rows.into_iter()
        .map(|(payee, item, reference)| {
            let amount = 20 + u64::from(stream.byte() % 80);
            fixed(payee, &reference, item, usdc(amount), false)
        })
        .collect()
}

fn inv_suffix(stream: &mut Stream<'_>) -> String {
    let mut n = 3000 + u32::from(stream.u16() % 4000);
    if n == 2210 {
        n = 2211;
    }
    format!("INV-{n}")
}

fn fixed(payee: &str, reference: &str, item: &str, total: u128, paid: bool) -> Line {
    Line {
        payee: payee.into(),
        reference: reference.into(),
        item: item.into(),
        qty: 1,
        unit: total,
        total,
        paid,
    }
}

fn usdc(whole: u64) -> u128 {
    u128::from(whole) * 1_000_000
}

fn mac_message(vault_id: &str, round: u64, player_id: &str, venue: Venue) -> Vec<u8> {
    let mut msg = b"bouncer.ledger.v1".to_vec();
    msg.push(0);
    msg.extend(vault_id.as_bytes());
    msg.push(0);
    msg.extend(round.to_le_bytes());
    msg.push(0);
    msg.extend(player_id.as_bytes());
    msg.push(0);
    msg.extend(venue.as_str().as_bytes());
    msg
}

pub(crate) fn hmac(key: &[u8; 32], data: &[u8]) -> [u8; 32] {
    let mut mac = HmacSha256::new_from_slice(key).expect("hmac key");
    mac.update(data);
    let bytes = mac.finalize().into_bytes();
    let mut out = [0u8; 32];
    out.copy_from_slice(&bytes);
    out
}

pub(crate) struct Stream<'a> {
    seed: &'a [u8; 32],
    mac: [u8; 32],
    counter: u32,
    block: [u8; 32],
    at: usize,
}

impl<'a> Stream<'a> {
    pub(crate) fn new(seed: &'a [u8; 32], mac: [u8; 32]) -> Self {
        let block = hmac(seed, &block_message(&mac, 1));
        Self { seed, mac, counter: 1, block, at: 0 }
    }

    pub(crate) fn byte_below(&mut self, n: u8) -> u8 {
        self.byte() % n
    }

    pub(crate) fn byte(&mut self) -> u8 {
        if self.at == 32 {
            self.counter = self.counter.saturating_add(1);
            self.block = hmac(self.seed, &block_message(&self.mac, self.counter));
            self.at = 0;
        }
        let byte = self.block[self.at];
        self.at += 1;
        byte
    }

    pub(crate) fn u64(&mut self) -> u64 {
        let mut bytes = [0u8; 8];
        for slot in &mut bytes {
            *slot = self.byte();
        }
        u64::from_le_bytes(bytes)
    }

    fn u16(&mut self) -> u16 {
        u16::from_le_bytes([self.byte(), self.byte()])
    }
}

fn block_message(mac: &[u8; 32], counter: u32) -> Vec<u8> {
    let mut msg = mac.to_vec();
    msg.extend(counter.to_le_bytes());
    msg
}
