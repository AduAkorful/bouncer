import type { Metadata } from "next";
import { Bungee, Bungee_Inline, JetBrains_Mono, Schibsted_Grotesk } from "next/font/google";
import "./globals.css";

const bungee = Bungee({ variable: "--font-bungee", weight: "400", subsets: ["latin"] });
const bungeeInline = Bungee_Inline({ variable: "--font-bungee-inline", weight: "400", subsets: ["latin"] });
const schibsted = Schibsted_Grotesk({ variable: "--font-schibsted", subsets: ["latin"] });
const jetbrains = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Bouncer prototype",
  description: "Design prototype with demo data. Not the product.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${bungee.variable} ${bungeeInline.variable} ${schibsted.variable} ${jetbrains.variable} h-full antialiased`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
