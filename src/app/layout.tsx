import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "PyScaffold — Belajar Python bertahap",
  description: "Media pembelajaran algoritma dan pemrograman Python.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
