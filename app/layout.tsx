import type { Metadata, Viewport } from "next";
import { Press_Start_2P } from "next/font/google";
import { GoogleAnalytics } from "@next/third-parties/google";
import "./globals.css";

const GA_ID = "G-31HYRXCKRG";

const pressStart = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-press-start",
});

export const metadata: Metadata = {
  title: "A Volar Facho",
  description:
    "Firmes a la cárcel: despega como cohete hacia el cielo, esquiva los frailejones que caen como naves y consigue la mayor altura.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0d0d1a",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className={pressStart.variable}>{children}</body>
      {process.env.NODE_ENV === "production" && <GoogleAnalytics gaId={GA_ID} />}
    </html>
  );
}
