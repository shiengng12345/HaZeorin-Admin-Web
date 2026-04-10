import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "HaZeorin Admin",
  description:
    "Platform-side admin portal for HaZeorin approval flows, reporting, and subscription operations."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
