import { readRelayEnv } from "@/lib/config";
import { httpRpc, readDoor } from "@/lib/chain";
import { parseCrack, viewRequest } from "@/lib/vault";

export async function POST(request: Request) {
  const env = readRelayEnv(process.env);
  if (!env.ok) return Response.json({ ok: false, error: "missing env", missing: env.missing }, { status: 400 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "crack" }, { status: 400 });
  }
  const raidId = body && typeof body === "object" ? (body as { raid_id?: unknown }).raid_id : null;
  if (typeof raidId !== "string" || raidId.length === 0) return Response.json({ ok: false, error: "crack" }, { status: 400 });
  const rpc = httpRpc(env.env.rpcUrl);
  const door = await readDoor(rpc, env.env.contractId, env.env.vaultId);
  if (!door.ok) return Response.json(door, { status: 502 });
  const round = Number(door.vault.round);
  if (!Number.isSafeInteger(round)) return Response.json({ ok: false, error: "crack" }, { status: 502 });
  const crackResult = await rpc(viewRequest(env.env.contractId, "get_crack", { vault_id: env.env.vaultId, round, raid_id: raidId }));
  if (!crackResult.ok) return Response.json(crackResult, { status: 502 });
  const crack = parseCrack(crackResult.value);
  if (!crack.ok) return Response.json(crack, { status: 502 });
  const now = await chainNowMs(env.env.rpcUrl);
  if (!now.ok) return Response.json(now, { status: 502 });
  return Response.json({ ok: true, crack: crack.crack, nowMs: now.nowMs, vault: door.vault });
}

async function chainNowMs(rpcUrl: string): Promise<{ ok: true; nowMs: number } | { ok: false; error: string }> {
  try {
    const response = await fetch(rpcUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: "status", method: "status", params: [] }),
    });
    if (!response.ok) return { ok: false, error: "rpc" };
    const body = (await response.json()) as { result?: { sync_info?: { latest_block_time?: unknown } } };
    const time = body.result?.sync_info?.latest_block_time;
    if (typeof time !== "string") return { ok: false, error: "rpc" };
    const nowMs = Date.parse(time);
    if (!Number.isFinite(nowMs)) return { ok: false, error: "rpc" };
    return { ok: true, nowMs };
  } catch {
    return { ok: false, error: "rpc" };
  }
}
