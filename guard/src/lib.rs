//! Door guard. The ledger and the verdict live here. The model writes chat.
//! It does not hold a payout key, and a sentence it produces is not a signature.

mod api;
mod chat;
mod door_view;
mod draft;
mod host;
mod ids;
mod ledger;
mod manifest;
pub mod model_diagnostic;
mod rules;
mod session;
mod spec;
mod spec_check;
mod spec_ledger;
mod spec_ops;
mod street;
mod verdict;

pub use api::handle;
pub use door_view::door_from_reports;
pub use host::{Budget, Chain, DoorView, Host, Model, Random, Sealer, Signer};
pub use ledger::{generate, match_bill, Draft, Hit, Line, Rule, Venue, DEMO_BUILDERS};
pub use manifest::{check_manifest, MODEL_ID, MAX_TOKENS, NETWORK_HOST, TEMPERATURE_MILLI};
pub use verdict::GENERATOR;

#[cfg(test)]
mod tests;
#[cfg(test)]
mod spec_tests;
#[cfg(test)]
mod retry_tests;
#[cfg(test)]
mod abuse_tests;
