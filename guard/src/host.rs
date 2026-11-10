/// Time and the vault door, as the wasi adapter reports them.
/// A missing clock or a failed view is an error. Reveal does not guess.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct DoorView {
    pub open: bool,
    pub closes_at: u64,
    pub now: u64,
}

pub trait Signer {
    fn public_key(&self) -> [u8; 32];
    fn sign(&mut self, message: &[u8]) -> [u8; 64];
}

pub trait Model {
    fn complete(&mut self, system: &str, user: &str) -> Result<String, ()>;
    /// Sponsor drafts may return a fixed failure category; other callers keep the flat error.
    fn complete_draft(&mut self, system: &str, user: &str) -> Result<String, crate::model_diagnostic::ModelFailure> {
        self.complete(system, user).map_err(|_| crate::model_diagnostic::ModelFailure::Unknown)
    }
    /// Evidence for the last completion, when the host could get it. Evidence only: it never gates play.
    fn evidence(&mut self) -> Option<serde_json::Value> {
        None
    }
    /// The model's attestation, fetched with a fresh nonce before any completion in a raid.
    fn preflight(&mut self) -> Option<serde_json::Value> {
        None
    }
}

pub trait Chain {
    fn door(&self, vault_id: &str) -> Result<DoorView, ()>;
}

pub trait Random {
    fn nonce(&mut self) -> [u8; 12];
}

pub trait Budget {
    /// Highest `used` already accepted for this vault, round, and player.
    fn seen(&self, key: &str) -> u8;
    fn record(&mut self, key: &str, used: u8);
    /// The last reply the guard gave this player, with the hash of the call that earned it.
    /// A retry of that call after a lost reply is answered from here.
    fn last(&self, key: &str) -> Option<(String, String)>;
    /// Store the reply before the mark is recorded. An error stops the turn.
    fn keep(&mut self, key: &str, hash: &str, response: &str) -> Result<(), ()>;
}

/// Seals and opens a sponsor's spec under the project's encryption key. The key never reaches
/// the guest. A failure is an error, and the guard never makes up a key.
pub trait Sealer {
    fn seal(&self, aad: &[u8], plain: &[u8]) -> Result<Vec<u8>, ()>;
    fn open(&self, aad: &[u8], ciphertext: &[u8]) -> Result<Vec<u8>, ()>;
}

pub struct Host<M, S, C, R, B> {
    pub seed: [u8; 32],
    pub model: M,
    pub signer: S,
    pub chain: C,
    pub random: R,
    pub budget: B,
    pub sealer: Box<dyn Sealer>,
}
