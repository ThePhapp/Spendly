import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "Spendly — Tài chính cá nhân",
  description: "Theo dõi chi tiêu, ngân sách và mục tiêu tài chính trong một nơi.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body className="antialiased"><ThemeProvider>{children}<Toaster richColors position="top-center" /></ThemeProvider></body>
    </html>
  );
}
