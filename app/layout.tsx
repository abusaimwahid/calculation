import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LifeLedger",
  description: "Private personal finance and daily transaction tracker",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
