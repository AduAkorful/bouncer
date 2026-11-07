/** A testnet payment, opened on the public explorer. A bad hash does not become a link. */

const TX_HASH = /^[1-9A-HJ-NP-Za-km-z]{32,88}$/;

export function payoutExplorerUrl(hash: string): string | null {
  if (!TX_HASH.test(hash)) return null;
  return `https://testnet.nearblocks.io/txns/${hash}`;
}
