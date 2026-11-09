use super::support::*;
use crate::payout::StorageBalance;
use crate::state::*;
use crate::verdict::claim_bytes;
use near_sdk::PromiseError;
use near_sdk::json_types::U128;
use near_sdk::NearToken;

fn hex(bytes: &[u8]) -> String {
    const H: &[u8; 16] = b"0123456789abcdef";
    let mut out = String::with_capacity(bytes.len() * 2);
    for byte in bytes {
        out.push(H[(byte >> 4) as usize] as char);
        out.push(H[(byte & 0xf) as usize] as char);
    }
    out
}

fn claim_at(door: &mut Door, raid: &str, payout: &str, now: u64, signature: Vec<u8>) {
    door.world.at(payout, now);
    door.world.contract.claim(
        door.vault_id.clone(),
        1,
        raid.into(),
        id(payout),
        signature,
    );
}

#[test]
#[should_panic(expected = "too early to claim")]
fn claim_before_unlock() {
    let mut door = pay_door();
    door.submit("r1", PLAYER, 40, 1, 1);
    let crack = door.crack(1, "r1");
    let signature = sign_claim(&door.claim, "velvet", 1, "r1", PLAYER);
    claim_at(&mut door, "r1", PLAYER, crack.unlock_at - 1, signature);
}

#[test]
#[should_panic(expected = "claim expired")]
fn claim_after_expiry() {
    let mut door = pay_door();
    door.submit("r1", PLAYER, 40, 1, 1);
    let crack = door.crack(1, "r1");
    let signature = sign_claim(&door.claim, "velvet", 1, "r1", PLAYER);
    claim_at(&mut door, "r1", PLAYER, crack.expires_at + 1, signature);
}

#[test]
#[should_panic(expected = "bad claim signature")]
fn claim_signature_for_a_different_payout() {
    let mut door = pay_door();
    door.submit("r1", PLAYER, 40, 1, 1);
    let unlock = door.crack(1, "r1").unlock_at;
    let signature = sign_claim(&door.claim, "velvet", 1, "r1", PLAYER);
    claim_at(&mut door, "r1", "other.test.near", unlock, signature);
}

#[test]
#[should_panic(expected = "sponsor cannot claim")]
fn the_sponsor_cannot_claim_its_own_door() {
    let mut door = pay_door();
    door.submit("r1", PLAYER, 40, 1, 1);
    let unlock = door.crack(1, "r1").unlock_at;
    let signature = sign_claim(&door.claim, "velvet", 1, "r1", SPONSOR);
    claim_at(&mut door, "r1", SPONSOR, unlock, signature);
}

#[test]
#[should_panic(expected = "sponsor cannot claim")]
fn the_owner_cannot_claim() {
    let mut door = pay_door();
    door.submit("r1", PLAYER, 40, 1, 1);
    let unlock = door.crack(1, "r1").unlock_at;
    let signature = sign_claim(&door.claim, "velvet", 1, "r1", OWNER);
    claim_at(&mut door, "r1", OWNER, unlock, signature);
}

#[test]
fn a_sponsor_crack_left_unclaimed_returns_to_the_pot() {
    let mut door = pay_door();
    let start = door.vault();
    let before = start.day_pot + start.pot;
    door.submit("r1", PLAYER, 40, 1, 1);
    let crack = door.crack(1, "r1");
    door.world.at(SPONSOR, crack.expires_at + 1);
    door.world.contract.expire(door.vault_id.clone(), 1, "r1".into());
    let after = door.vault();
    assert_eq!(door.crack(1, "r1").status, CrackStatus::Expired);
    assert_eq!(after.reserved, 0);
    assert_eq!(after.day_pot + after.pot, before);
    assert_eq!(after.crack_count, 1);
}

#[test]
#[should_panic(expected = "payout mismatch")]
fn predecessor_is_not_the_payout() {
    let mut door = pay_door();
    door.submit("r1", PLAYER, 40, 1, 1);
    let unlock = door.crack(1, "r1").unlock_at;
    let signature = sign_claim(&door.claim, "velvet", 1, "r1", PLAYER);
    door.world.at(OWNER, unlock);
    door.world.contract.claim(door.vault_id.clone(), 1, "r1".into(), id(PLAYER), signature);
}

#[test]
fn callback_failure_returns_the_amount_and_one_retry_pays() {
    let mut door = pay_door();
    door.submit("r1", PLAYER, 40, 1, 1);
    let unlock = door.crack(1, "r1").unlock_at;
    let signature = sign_claim(&door.claim, "velvet", 1, "r1", PLAYER);
    let accounted = door.world.contract.get_accounted();
    claim_at(&mut door, "r1", PLAYER, unlock, signature.clone());
    assert_eq!(door.crack(1, "r1").status, CrackStatus::Pending);
    door.world.at(CONTRACT, unlock);
    door.world.contract.on_transfer_done(
        Outflow::Claim { vault_id: "velvet".into(), round: 1, raid_id: "r1".into() },
        U128(40),
        Err(PromiseError::Failed),
    );
    let crack = door.crack(1, "r1");
    assert_eq!(crack.status, CrackStatus::Failed);
    assert_eq!(door.vault().day_pot, 4_000_000);
    assert_eq!(door.vault().reserved, 0);
    assert_eq!(door.world.contract.get_accounted(), accounted);
    books(&door.world.contract, &["velvet"]);

    claim_at(&mut door, "r1", PLAYER, unlock, signature);
    assert_eq!(door.crack(1, "r1").status, CrackStatus::Pending);
    assert_eq!(door.vault().reserved, 40);
    door.world.at(CONTRACT, unlock);
    door.world.contract.on_transfer_done(
        Outflow::Claim { vault_id: "velvet".into(), round: 1, raid_id: "r1".into() },
        U128(40),
        Ok(()),
    );
    assert_eq!(door.crack(1, "r1").status, CrackStatus::Paid);
    assert_eq!(door.vault().reserved, 0);
    assert_eq!(door.world.contract.get_accounted(), accounted - 40);
    books(&door.world.contract, &["velvet"]);
}

#[test]
fn failed_transfer_after_close_returns_to_the_pot() {
    let mut door = pay_door();
    door.submit("r1", PLAYER, 40, 1, 1);
    door.world.at(OWNER, 1);
    door.world.contract.close_round(door.vault_id.clone());
    let pot = door.vault().pot;
    let unlock = door.crack(1, "r1").unlock_at;
    let signature = sign_claim(&door.claim, "velvet", 1, "r1", PLAYER);
    claim_at(&mut door, "r1", PLAYER, unlock, signature);
    door.world.at(CONTRACT, unlock);
    door.world.contract.on_transfer_done(
        Outflow::Claim { vault_id: "velvet".into(), round: 1, raid_id: "r1".into() },
        U128(40),
        Err(PromiseError::Failed),
    );
    assert_eq!(door.vault().pot, pot + 40);
    assert_eq!(door.vault().day_pot, 0);
    books(&door.world.contract, &["velvet"]);
}

#[test]
#[should_panic(expected = "not pending")]
fn callback_success_pays_once() {
    let mut door = pay_door();
    door.submit("r1", PLAYER, 40, 1, 1);
    let unlock = door.crack(1, "r1").unlock_at;
    let signature = sign_claim(&door.claim, "velvet", 1, "r1", PLAYER);
    claim_at(&mut door, "r1", PLAYER, unlock, signature);
    let outflow = Outflow::Claim { vault_id: "velvet".into(), round: 1, raid_id: "r1".into() };
    door.world.at(CONTRACT, unlock);
    door.world.contract.on_transfer_done(outflow.clone(), U128(40), Ok(()));
    door.world.contract.on_transfer_done(outflow, U128(40), Ok(()));
}

#[test]
fn storage_deposit_and_transfer_use_the_pinned_amounts() {
    let mut door = pay_door();
    door.submit("r1", PLAYER, 40, 1, 1);
    let unlock = door.crack(1, "r1").unlock_at;
    let signature = sign_claim(&door.claim, "velvet", 1, "r1", PLAYER);
    let before = calls().len();
    claim_at(&mut door, "r1", PLAYER, unlock, signature);
    door.world.at(CONTRACT, unlock);
    door.world.contract.on_storage_checked(
        id(PLAYER),
        U128(40),
        Outflow::Claim { vault_id: "velvet".into(), round: 1, raid_id: "r1".into() },
        Ok(None),
    );
    let fresh: Vec<_> = calls().into_iter().skip(before).collect();
    assert!(fresh.iter().any(|call| {
        call.method == "storage_deposit" && call.deposit == NearToken::from_yoctonear(STORAGE_DEPOSIT)
    }));
    assert!(fresh.iter().any(|call| call.method == "ft_transfer" && call.deposit == NearToken::from_yoctonear(1)));
    let _ = StorageBalance { total: U128(1), available: U128(1) };
}

#[test]
fn claim_bytes_fixture() {
    assert_eq!(
        hex(&claim_bytes("velvet-1", 1, "raid-1", "alice.testnet")),
        "626f756e6365722e636c61696d2e76310800000076656c7665742d31010000000000000006000000726169642d310d000000616c6963652e746573746e6574"
    );
}

#[test]
fn registered_receiver_skips_the_storage_deposit() {
    let mut door = pay_door();
    door.submit("r1", PLAYER, 40, 1, 1);
    let unlock = door.crack(1, "r1").unlock_at;
    let signature = sign_claim(&door.claim, "velvet", 1, "r1", PLAYER);
    claim_at(&mut door, "r1", PLAYER, unlock, signature);
    door.world.at(CONTRACT, unlock);
    let before = calls().len();
    door.world.contract.on_storage_checked(
        id(PLAYER),
        U128(40),
        Outflow::Claim { vault_id: "velvet".into(), round: 1, raid_id: "r1".into() },
        Ok(Some(StorageBalance { total: U128(STORAGE_DEPOSIT), available: U128(0) })),
    );
    let fresh: Vec<_> = calls().into_iter().skip(before).collect();
    assert!(fresh.iter().all(|call| call.method != "storage_deposit"));
    assert!(fresh.iter().any(|call| call.method == "ft_transfer" && call.deposit == NearToken::from_yoctonear(1)));
}
