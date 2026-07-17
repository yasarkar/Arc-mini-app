import type { Metadata } from "next";
import { Space_Grotesk, DM_Sans, Space_Mono } from "next/font/google";
import { Providers } from "./providers";
import "@/styles/globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-space-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ArcFlow — Smart Wallet",
  description:
    "ArcFlow: Akıllı Cüzdan ve Kişisel Finans — Arc L1 Blockchain üzerinde USDC-native finansal kontrol paneli.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${dmSans.className} ${spaceGrotesk.variable} ${dmSans.variable} ${spaceMono.variable} antialiased bg-arc-bg-dark text-white`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
