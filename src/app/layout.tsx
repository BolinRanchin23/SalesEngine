import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { NavLink } from "@/components/nav-link";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SalesEngine",
  description: "Sales intelligence engine",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#0b0f1a] text-slate-200 min-h-screen`}
      >
        <nav className="bg-[#111827]/80 backdrop-blur-xl border-b border-slate-800/60 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-14">
              <div className="flex items-center gap-8">
                <Link href="/dashboard" className="text-lg font-bold text-white tracking-tight">
                  Sales<span className="text-blue-400">Engine</span>
                </Link>
                <div className="flex gap-1">
                  <NavLink href="/dashboard">Dashboard</NavLink>
                  <NavLink href="/companies">Companies</NavLink>
                  <NavLink href="/pipeline">Pipeline</NavLink>
                  <NavLink href="/enrichment">Enrichment</NavLink>
                </div>
              </div>
            </div>
          </div>
        </nav>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </main>
      </body>
    </html>
  );
}
