import { KeyPair, type KeyPairString } from "near-api-js";

/**
 * Plan 73. The server holds two keys that NEAR lets us scope: the one that records verdicts and the keeper's.
 * Each is read back from the chain before it is used, and anything but a function-call key on the vault with
 * exactly the expected methods is refused. A full-access key in either slot is a mistake, not a fallback.
 */

export type KeyScope = "scoped" | "full" | "wrong" | "missing";
export type KeyState = KeyScope | "unread";
export type Expect = { receiver: string; methods: readonly string[] };

/** One `view_access_key` answer: the RPC's `result`, or the error when the key is not on the account. */
export function classifyKey(view: { result?: unknown; error?: unknown }, expect: Expect): KeyScope | null {
  if (view.result && typeof view.result === "object") {
    const permission = (view.result as { permission?: unknown }).permission;
    if (permission === "FullAccess") return "full";
    const call = permission && typeof permission === "object" ? (permission as { FunctionCall?: unknown }).FunctionCall : null;
    if (!call || typeof call !== "object") return "wrong";
    const { receiver_id: receiver, method_names: methods } = call as { receiver_id?: unknown; method_names?: unknown };
    if (receiver !== expect.receiver || !Array.isArray(methods)) return "wrong";
    const have = new Set(methods);
    // An empty list on chain means any method on the receiver, so it is never the exact set.
    const exact = methods.length === expect.methods.length && have.size === expect.methods.length && expect.methods.every((m) => have.has(m));
    return exact ? "scoped" : "wrong";
  }
  const described = JSON.stringify(view.error ?? "");
  if (/UNKNOWN_ACCESS_KEY|does not exist|UNKNOWN_ACCOUNT/.test(described)) return "missing";
  return null;
}

/** The remaining gas allowance in yocto, or null for an unlimited or unreadable one. */
export function allowanceOf(view: { result?: unknown }): bigint | null {
  const permission = view.result && typeof view.result === "object" ? (view.result as { permission?: unknown }).permission : null;
  const call = permission && typeof permission === "object" ? (permission as { FunctionCall?: { allowance?: unknown } }).FunctionCall : null;
  const allowance = call?.allowance;
  return typeof allowance === "string" && /^[0-9]+$/.test(allowance) ? BigInt(allowance) : null;
}

export function publicKeyOf(privateKey: string): string | null {
  try {
    return KeyPair.fromString(privateKey as KeyPairString).getPublicKey().toString();
  } catch {
    return null;
  }
}

export type KeySlot = { name: string; accountId: string; privateKey: string; expect: Expect };
export type SlotState = { state: KeyState; allowanceNear: string | null; low: boolean };

const YOCTO_PER_NEAR = 10n ** 24n;

function near(yocto: bigint): string {
  const whole = yocto / YOCTO_PER_NEAR;
  const rest = ((yocto % YOCTO_PER_NEAR) * 1000n) / YOCTO_PER_NEAR;
  return `${whole}.${rest.toString().padStart(3, "0")}`;
}

export function createKeyWatch(
  rpcUrl: string,
  slots: KeySlot[],
  fullAllowanceYocto: bigint,
  log: (line: string) => void,
  fetchImpl: typeof fetch = fetch,
) {
  const states = new Map<string, SlotState>(slots.map((slot) => [slot.name, { state: "unread", allowanceNear: null, low: false }]));

  async function read(slot: KeySlot): Promise<{ result?: unknown; error?: unknown } | null> {
    const publicKey = publicKeyOf(slot.privateKey);
    if (!publicKey) return { error: "UNKNOWN_ACCESS_KEY" };
    try {
      const response = await fetchImpl(rpcUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: "key", method: "query", params: { request_type: "view_access_key", finality: "final", account_id: slot.accountId, public_key: publicKey } }),
      });
      return (await response.json()) as { result?: unknown; error?: unknown };
    } catch {
      return null;
    }
  }

  async function check(): Promise<void> {
    for (const slot of slots) {
      const view = await read(slot);
      const scope = view ? classifyKey(view, slot.expect) : null;
      const before = states.get(slot.name)!;
      // A failed read keeps the last answer; a first read that fails stays "unread", which blocks.
      if (scope === null) continue;
      const allowance = view ? allowanceOf(view) : null;
      const low = scope === "scoped" && allowance !== null && allowance * 5n < fullAllowanceYocto;
      if (scope !== before.state) log(`${slot.name} key is ${scope}${scope === "scoped" ? "" : ": refusing to use it"}`);
      if (low && !before.low) log(`${slot.name} key allowance is low: add a new function-call key before it runs out`);
      states.set(slot.name, { state: scope, allowanceNear: allowance === null ? null : near(allowance), low });
    }
  }

  return {
    check,
    ready: (name: string) => states.get(name)?.state === "scoped",
    state: () => Object.fromEntries(states),
  };
}
