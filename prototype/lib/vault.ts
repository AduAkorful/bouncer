export type VaultView = {
  sponsor: string;
  pot: string;
  dayPot: string;
  reserved: string;
  cap: string;
  lockNs: string;
  rule: "PayTheBill" | "SplitTheDay";
  guardPk: string | null;
  commitment: string | null;
  guardVersion: string | null;
  round: string;
  opensAt: string;
  closesAt: string;
  open: boolean;
  challengeEnd: string | null;
  maxCracks: number;
  ticketed: boolean;
  closedPendingBump: boolean;
  refundInFlight: string;
  crackCount: number;
  keeper: string | null;
  specHash: string | null;
  card: string | null;
  specLocked: boolean;
  suspended: boolean;
};

export type CrackView = {
  playerId: string;
  claimPk: string;
  amount: string;
  recordedAt: string;
  unlockAt: string;
  expiresAt: string;
  status: string;
};
