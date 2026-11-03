import type { CrewEnv } from "./config.ts";

const WHOLE = 10_000n;

export type CrewCall = {
  contractId: string;
  method: "create";
  depositYocto: string;
  gas: string;
  daoAccount: string;
  args: { name: string; args: string };
};

export type ProposalCall = {
  method: "add_proposal";
  depositYocto: string;
  args: { proposal: { description: string; kind: Record<string, unknown> } };
};

export function buildCreateCrew(env: CrewEnv | null | undefined, name: string, members: string[]): { ok: true; call: CrewCall } | { ok: false; error: string } {
  if (!env?.factoryId || !/^[0-9]+$/.test(env.depositYocto) || !/^[0-9]+$/.test(env.gas)) return { ok: false, error: "missing env" };
  const daoName = name.trim().toLowerCase();
  if (!/^[a-z0-9]([a-z0-9-]{0,30}[a-z0-9])?$/.test(daoName)) return { ok: false, error: "name" };
  const council = [...new Set(members.map((account) => account.trim()).filter(Boolean))];
  if (council.length < 2 || council.length > 4 || council.some((account) => !/^[a-z0-9._-]{2,64}$/.test(account))) {
    return { ok: false, error: "council" };
  }
  const body = JSON.stringify({
    config: { name: daoName, purpose: daoName, metadata: "" },
    policy: council,
  });
  return {
    ok: true,
    call: {
      contractId: env.factoryId,
      method: "create",
      depositYocto: env.depositYocto,
      gas: env.gas,
      daoAccount: `${daoName}.${env.factoryId}`,
      args: { name: daoName, args: toBase64(body) },
    },
  };
}

export function bondFromPolicy(policy: unknown): string | null {
  const body = policy && typeof policy === "object" && "Current" in policy ? (policy as { Current?: unknown }).Current : policy;
  if (!body || typeof body !== "object") return null;
  const bond = (body as { proposal_bond?: unknown }).proposal_bond;
  if (typeof bond !== "string" || !/^[0-9]+$/.test(bond)) return null;
  return bond;
}

export function buildAddProposal(
  bond: string | null,
  description: string,
  kind: Record<string, unknown>,
): { ok: true; call: ProposalCall } | { ok: false; error: string } {
  if (bond === null || !/^[0-9]+$/.test(bond)) return { ok: false, error: "missing bond" };
  return {
    ok: true,
    call: {
      method: "add_proposal",
      depositYocto: bond,
      args: { proposal: { description, kind } },
    },
  };
}

export function evenSplit(amount: bigint, members: number): bigint[] | null {
  if (!Number.isInteger(members) || members < 2 || members > 4 || amount < 0n) return null;
  const each = amount / BigInt(members);
  return Array.from({ length: members }, () => each);
}

export function policyShares(amount: bigint, parts: bigint[]): bigint[] | null {
  const sum = parts.reduce((total, part) => total + part, 0n);
  if (sum !== WHOLE || parts.some((part) => part < 0n)) return null;
  return parts.map((part) => (amount * part) / WHOLE);
}

function toBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}
