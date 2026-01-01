import type { Metadata } from "next";
import { DM_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { Providers } from "@/components/providers";
import "./globals.css";

const dmMono = DM_Mono({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
});

export const metadata: Metadata = {
  title: "Agentic Vision Board",
  description: "Create your 2026 vision board with AI-generated images",
  icons: {
    icon: "/brand/favicon.png",
    apple: "/brand/favicon.png",
  },
  openGraph: {
    title: "Agentic Vision Board",
    description: "Create your 2026 vision board with AI-generated images",
    images: ["/brand/og_vb.png"],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Agentic Vision Board",
    description: "Create your 2026 vision board with AI-generated images",
    images: ["/brand/og_vb.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${dmMono.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
        <Analytics />
      </body>
    </html>
  );
}
