import type { Metadata } from "next";
import { Geist, Geist_Mono, Playfair_Display } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Toaster } from "sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "House of Tailors | Luxury Tailoring ERP",
  description: "Enterprise-grade tailoring management platform",
  keywords: ["tailoring", "ERP", "management", "luxury", "fashion"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${playfair.variable} dark`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-background antialiased">
        <Providers>
          {children}
          <Toaster
            theme="dark"
            position="top-right"
            toastOptions={{
              style: {
                background: "hsl(0 0% 8%)",
                border: "1px solid hsl(0 0% 16%)",
                color: "hsl(0 0% 95%)",
              },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
