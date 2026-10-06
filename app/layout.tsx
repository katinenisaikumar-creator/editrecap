import "./globals.css";
import type { Metadata } from "next";
import Nav from "@/components/nav";

export const metadata: Metadata = { title: "EditRecap — Video Template Extractor", description: "Turn any edit into a reusable template." };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#0a0a0a] antialiased">
        <Nav />
        {children}
      </body>
    </html>
  );
}
