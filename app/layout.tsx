import type { Metadata } from "next";
import { DM_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { ThemeProvider } from "next-themes";
import { ClerkProvider } from "@clerk/nextjs";
import { Providers } from "@/components/providers";
import "./globals.css";

const dmMono = DM_Mono({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.agenticboard.xyz"),
  title: "Agentic Vision Board",
  description: "Create your 2026 vision board with AI-generated images",
  icons: {
    icon: "/brand/favicon.png",
    apple: "/brand/favicon.png",
  },
  other: {
    "og:logo": "https://www.agenticboard.xyz/brand/favicon.png",
  },
  openGraph: {
    title: "Agentic Vision Board",
    description: "Create your 2026 vision board with AI-generated images",
    url: "https://www.agenticboard.xyz",
    siteName: "Agentic Vision Board",
    images: [
      {
        url: "/brand/og_vb_black.png",
        width: 1200,
        height: 630,
        alt: "Agentic Vision Board - Create your 2026 vision board with AI",
      },
    ],
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Agentic Vision Board",
    description: "Create your 2026 vision board with AI-generated images",
    images: ["/brand/og_vb_black.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body className={`${dmMono.variable} font-sans antialiased`}>
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem
            disableTransitionOnChange={false}
          >
            <Providers>{children}</Providers>
          </ThemeProvider>
          <Analytics />
        </body>
      </html>
    </ClerkProvider>
  );
}
