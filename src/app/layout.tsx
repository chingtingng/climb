import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Plus_Jakarta_Sans, Poppins } from "next/font/google";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Chalk Passport",
  description:
    "Track the climbing places you’ve visited — countries, cities, and your highest grade at each.",
  applicationName: "Chalk Passport",
  authors: [{ name: "chalkchingup" }],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Matches --paper in globals.css, the colour painted at the top of the viewport.
  themeColor: "#f7fbfe",
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${poppins.variable} ${jakarta.variable} h-full`}
    >
      <body className="min-h-full font-sans antialiased">{children}</body>
    </html>
  );
}
