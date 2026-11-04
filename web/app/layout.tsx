import { screen } from "@/lib/screen";
import type { ReactNode } from "react";
import { Bungee, Bungee_Inline, JetBrains_Mono, Schibsted_Grotesk } from "next/font/google";
import "./globals.css";

const bungee = Bungee({ variable: "--font-bungee", weight: "400", subsets: ["latin"] });
const bungeeInline = Bungee_Inline({ variable: "--font-bungee-inline", weight: "400", subsets: ["latin"] });
const schibsted = Schibsted_Grotesk({ variable: "--font-schibsted", subsets: ["latin"] });
const jetbrains = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin"] });

export const metadata = screen("Bouncer", "An AI door-guard game. The vault pays. The model does not.");

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${bungee.variable} ${bungeeInline.variable} ${schibsted.variable} ${jetbrains.variable} h-full antialiased`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
