/**
 * An account the relay made for a passkey is named `p<12 hex>.<relay>`. The name is a hash, so pages call it
 * "your wallet" instead of printing it.
 */
export function generatedAccount(accountId: string): boolean {
  return /^p[0-9a-f]{12}\./.test(accountId);
}
