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
}

pub struct Host<M, S, C, R, B> {
    pub seed: [u8; 32],
    pub model: M,
    pub signer: S,
    pub chain: C,
    pub random: R,
    pub budget: B,
}
