import "./globals.css";
import type { Metadata } from "next";
import { Providers } from "@/components/Providers";
import { Nunito_Sans, Inter, JetBrains_Mono } from "next/font/google";
import { cn } from "@/lib/utils";

const interHeading = Inter({ subsets: ["latin"], variable: "--font-heading" });
const nunitoSans = Nunito_Sans({ subsets: ["latin"], variable: "--font-sans" });
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "PyScaffold — Belajar Python bertahap",
  description:
    "Media pembelajaran algoritma dan Python dengan dukungan bertahap.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="id"
      className={cn(
        "font-sans",
        nunitoSans.variable,
        interHeading.variable,
        jetbrainsMono.variable,
      )}
    >
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
