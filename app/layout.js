import { Playfair_Display } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

const siteDescription =
  "A curated educational timeline of semiconductor industry history from 1947 to today.";

export const metadata = {
  metadataBase: new URL("https://the-chip-map.vercel.app"),
  title: "The Chip Map",
  description: siteDescription,
  openGraph: {
    title: "The Chip Map",
    description: siteDescription,
    url: "https://the-chip-map.vercel.app",
    siteName: "The Chip Map",
    type: "website",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "The Chip Map — semiconductor geopolitics timeline",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "The Chip Map",
    description: siteDescription,
    images: ["/og.png"],
  },
  icons: {
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${playfair.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
