//! Door guard. The ledger and the verdict live here. The model writes chat.
//! It does not hold a payout key, and a sentence it produces is not a signature.

mod api;
mod chat;
mod door_view;
mod host;
mod ids;
mod ledger;
mod manifest;
mod session;
mod street;
mod verdict;

pub use api::handle;
pub use door_view::door_from_reports;
pub use host::{Budget, Chain, DoorView, Host, Model, Random, Signer};
pub use ledger::{generate, match_bill, Draft, Hit, Line, Rule, Venue, DEMO_BUILDERS};
pub use manifest::{check_manifest, MODEL_ID, MAX_TOKENS, NETWORK_HOST, TEMPERATURE_MILLI};
pub use verdict::GENERATOR;

#[cfg(test)]
mod tests;
