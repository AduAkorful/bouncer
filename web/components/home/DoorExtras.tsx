"use client";

import dynamic from "next/dynamic";

/** Small signed-in lines under the door. They need the key libraries, so they load after the page is up. */
export const LazySignedInLine = dynamic(() => import("@/components/home/TonightRaid").then((m) => m.SignedInLine), { ssr: false });
export const LazyWalletChip = dynamic(() => import("@/components/profile/ProfileWallet").then((m) => m.WalletChip), { ssr: false });
