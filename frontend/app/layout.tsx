import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ScreenPulse Composer",
  description: "Real-time adaptive music and narration dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <div className="page-shell">{children}</div>
      </body>
    </html>
  );
}
