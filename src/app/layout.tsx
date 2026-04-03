import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Radio Free Utopia",
  description: "An old-school earth radical cyberpunk pirate radio transmitting coded messages from the utopian noosphere.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased m-0 p-0">
        {children}
      </body>
    </html>
  );
}
