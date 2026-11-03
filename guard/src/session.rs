use borsh::{BorshDeserialize, BorshSerialize};
use chacha20poly1305::aead::{Aead, KeyInit};
use chacha20poly1305::{ChaCha20Poly1305, Nonce};
use hkdf::Hkdf;
use sha2::Sha256;

use crate::ledger::{Rule, Venue};

pub const PLAYER: u8 = 1;
pub const GUARD: u8 = 2;
const MAX_USED: u8 = 6;

#[derive(Clone, Debug, BorshSerialize, BorshDeserialize)]
pub struct Turn {
    pub role: u8,
    pub text: String,
}

#[derive(Clone, Debug, BorshSerialize, BorshDeserialize)]
pub struct Session {
    pub vault_id: String,
    pub round: u64,
    pub player_id: String,
    pub raid_id: String,
    pub claim_pk: [u8; 32],
    pub venue: String,
    pub rule: u8,
    pub used: u8,
    pub transcript: Vec<Turn>,
}

impl Session {
    pub fn venue(&self) -> Result<Venue, &'static str> {
        Venue::parse(&self.venue).ok_or("venue")
    }

    pub fn rule(&self) -> Result<Rule, &'static str> {
        Rule::from_tag(self.rule).ok_or("rule")
    }

    pub fn spent(&self) -> bool {
        self.used >= MAX_USED
    }
}

pub fn seal(session: &Session, seed: &[u8; 32], nonce: [u8; 12]) -> Result<String, &'static str> {
    let key = blob_key(seed, &session.vault_id, session.round, &session.player_id)?;
    let plain = borsh::to_vec(session).map_err(|_| "borsh")?;
    let cipher = ChaCha20Poly1305::new((&key).into());
    let sealed = cipher.encrypt(Nonce::from_slice(&nonce), plain.as_ref()).map_err(|_| "seal")?;
    let mut blob = nonce.to_vec();
    blob.extend(sealed);
    Ok(hex::encode(blob))
}

pub fn unseal(blob: &str, seed: &[u8; 32], vault_id: &str, round: u64, player_id: &str) -> Result<Session, &'static str> {
    let bytes = hex::decode(blob).map_err(|_| "bad blob")?;
    if bytes.len() < 12 + 16 {
        return Err("bad blob");
    }
    let (nonce, sealed) = bytes.split_at(12);
    let key = blob_key(seed, vault_id, round, player_id)?;
    let cipher = ChaCha20Poly1305::new((&key).into());
    let plain = cipher.decrypt(Nonce::from_slice(nonce), sealed).map_err(|_| "bad blob")?;
    let session: Session = borsh::from_slice(&plain).map_err(|_| "bad blob")?;
    if session.vault_id != vault_id || session.round != round || session.player_id != player_id {
        return Err("bad blob");
    }
    Ok(session)
}

fn blob_key(seed: &[u8; 32], vault_id: &str, round: u64, player_id: &str) -> Result<[u8; 32], &'static str> {
    let hk = Hkdf::<Sha256>::new(Some(b"bouncer.blob.v1"), seed);
    let mut info = Vec::new();
    info.push(u8::try_from(vault_id.len()).map_err(|_| "bad id")?);
    info.extend(vault_id.as_bytes());
    info.extend(round.to_le_bytes());
    info.push(u8::try_from(player_id.len()).map_err(|_| "bad id")?);
    info.extend(player_id.as_bytes());
    let mut key = [0u8; 32];
    hk.expand(&info, &mut key).map_err(|_| "seal")?;
    Ok(key)
}
