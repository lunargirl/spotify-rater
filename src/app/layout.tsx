import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppProviders } from "@/components/AppProviders";
import { buildThemeBootstrapScript } from "@/lib/theme-bootstrap";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Spotify Rater",
  description: "Rate your Spotify tracks with precision from 0.00 to 10.00",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let themeScript = "";
  try {
    themeScript = buildThemeBootstrapScript();
  } catch (error) {
    console.error("[Layout] theme bootstrap failed:", error);
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {themeScript ? (
          <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        ) : null}
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
