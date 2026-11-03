export type CrewRoom = {
  joined: readonly string[];
  biller: string;
  transcript: string[];
};

export type CrewPost = {
  kind: "chat" | "bill";
  signer: string;
  message: string;
  signature: string;
};

export type CrewResult = { ok: true; callGuard: boolean } | { ok: false; error: string; callGuard: false };

export function acceptCrewPost(
  room: CrewRoom,
  post: CrewPost,
  verify: (signer: string, message: string, signature: string) => boolean,
): CrewResult {
  if (!verify(post.signer, post.message, post.signature)) return { ok: false, error: "signature", callGuard: false };
  if (post.kind === "chat") {
    if (!room.joined.includes(post.signer)) return { ok: false, error: "not joined", callGuard: false };
    room.transcript.push(post.message);
    return { ok: true, callGuard: false };
  }
  if (post.signer !== room.biller) return { ok: false, error: "not biller", callGuard: false };
  return { ok: true, callGuard: true };
}
