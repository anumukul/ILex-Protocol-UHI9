"use client";

import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { http } from "wagmi";
import { UNICHAIN_SEPOLIA } from "./contracts";

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "";

export const wagmiConfig = getDefaultConfig({
  appName: "ILex Protocol",
  projectId,
  chains: [UNICHAIN_SEPOLIA],
  transports: {
    [UNICHAIN_SEPOLIA.id]: http(),
  },
  ssr: true,
});
