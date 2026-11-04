/** The calls a sponsor sends. Argument shapes are the vault's own JSON, and a bad value builds nothing. */

export type Call = {
  receiverId: string;
  method: string;
  args: Record<string, unknown>;
  gas: bigint;
  depositYocto: bigint;
};

type Built = { ok: true; call: Call } | { ok: false; error: string };

const TGAS = 1_000_000_000_000n;
const ONE_YOCTO = 1n;
const MAX_SAFE = BigInt(Number.MAX_SAFE_INTEGER);

export const GAS = {
  create: 30n * TGAS,
  setSpec: 30n * TGAS,
  keeper: 30n * TGAS,
  commit: 30n * TGAS,
  /** `reclaim` needs the payout gas the contract demands. */
  reclaim: 300n * TGAS,
  fund: 100n * TGAS,
};

export function createSponsorVault(
  contractId: string,
  input: { vaultId: string; rule: "PayTheBill" | "SplitTheDay"; cap: bigint; lockNs: bigint; maxCracks: number },
  depositYocto: bigint,
): Built {
  if (!contractId || !input.vaultId || depositYocto <= 0n) return { ok: false, error: "missing value" };
  // The vault reads these as JSON numbers, which a browser holds exactly only up to 2^53.
  if (input.cap <= 0n || input.cap > MAX_SAFE || input.lockNs <= 0n || input.lockNs > MAX_SAFE) return { ok: false, error: "number too large" };
  if (!Number.isSafeInteger(input.maxCracks) || input.maxCracks < 1) return { ok: false, error: "max cracks" };
  return {
    ok: true,
    call: {
      receiverId: contractId,
      method: "create_sponsor_vault",
      args: { vault_id: input.vaultId, rule: input.rule, cap: Number(input.cap), lock_ns: Number(input.lockNs), max_cracks: input.maxCracks },
      gas: GAS.create,
      depositYocto,
    },
  };
}

export function setSpec(
  contractId: string,
  input: { vaultId: string; specCtHex: string; specHashHex: string; card: string },
  depositYocto: bigint,
): Built {
  const hash = bytes(input.specHashHex, 32);
  if (!contractId || !input.vaultId || !hash || !input.card || depositYocto <= 0n) return { ok: false, error: "missing value" };
  const ct = bytes(input.specCtHex);
  if (!ct || ct.length === 0) return { ok: false, error: "spec" };
  return {
    ok: true,
    call: {
      receiverId: contractId,
      method: "set_spec",
      args: { vault_id: input.vaultId, spec_ct: Buffer.from(ct).toString("base64"), spec_hash: hash, card: input.card },
      gas: GAS.setSpec,
      depositYocto,
    },
  };
}

export function setKeeper(contractId: string, vaultId: string, keeper: string | null): Built {
  if (!contractId || !vaultId) return { ok: false, error: "missing value" };
  return { ok: true, call: { receiverId: contractId, method: "set_keeper", args: { vault_id: vaultId, keeper }, gas: GAS.keeper, depositYocto: 0n } };
}

export function setCap(contractId: string, vaultId: string, cap: bigint): Built {
  if (!contractId || !vaultId || cap <= 0n || cap > MAX_SAFE) return { ok: false, error: "missing value" };
  return { ok: true, call: { receiverId: contractId, method: "set_cap", args: { vault_id: vaultId, cap: Number(cap) }, gas: GAS.keeper, depositYocto: 0n } };
}

export function setLock(contractId: string, vaultId: string, lockNs: bigint): Built {
  if (!contractId || !vaultId || lockNs <= 0n || lockNs > MAX_SAFE) return { ok: false, error: "missing value" };
  return { ok: true, call: { receiverId: contractId, method: "set_lock", args: { vault_id: vaultId, lock_ns: Number(lockNs) }, gas: GAS.keeper, depositYocto: 0n } };
}

export function reclaim(contractId: string, vaultId: string): Built {
  if (!contractId || !vaultId) return { ok: false, error: "missing value" };
  return { ok: true, call: { receiverId: contractId, method: "reclaim", args: { vault_id: vaultId }, gas: GAS.reclaim, depositYocto: 0n } };
}

/** `opens_at` is a nanosecond timestamp. A browser number holds it to within a few hundred nanoseconds, which is fine. */
export function commitRound(
  contractId: string,
  input: { vaultId: string; commitmentHex: string; guardVersionHex: string; opensAtNs: bigint; signatureHex: string },
): Built {
  const commitment = bytes(input.commitmentHex, 32);
  const version = bytes(input.guardVersionHex, 32);
  const signature = bytes(input.signatureHex, 64);
  if (!contractId || !input.vaultId || !commitment || !version || !signature) return { ok: false, error: "missing value" };
  if (input.opensAtNs < 0n) return { ok: false, error: "opens at" };
  return {
    ok: true,
    call: {
      receiverId: contractId,
      method: "commit_round",
      args: {
        vault_id: input.vaultId,
        commitment,
        guard_version: version,
        opens_at: Number(input.opensAtNs),
        guard_signature: signature,
      },
      gas: GAS.commit,
      depositYocto: 0n,
    },
  };
}

/** Fund the vault from the token. The vault credits a deposit only from its own sponsor. */
export function fund(tokenId: string, vaultContractId: string, vaultId: string, amount: bigint): Built {
  if (!tokenId || !vaultContractId || !vaultId || amount <= 0n) return { ok: false, error: "missing value" };
  return {
    ok: true,
    call: {
      receiverId: tokenId,
      method: "ft_transfer_call",
      args: { receiver_id: vaultContractId, amount: amount.toString(), msg: vaultId },
      gas: GAS.fund,
      depositYocto: ONE_YOCTO,
    },
  };
}

function bytes(hex: string, length?: number): number[] | null {
  if (!/^(?:[0-9a-fA-F]{2})+$/.test(hex)) return null;
  const out = Buffer.from(hex, "hex");
  if (length !== undefined && out.length !== length) return null;
  return [...out];
}
