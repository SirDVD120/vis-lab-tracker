import type { Metadata } from "next";
import { Figtree, Fraunces } from "next/font/google";
import { SiteHeader } from "@/components/SiteHeader";
import { NavigationProgressHost } from "@/components/NavigationProgressHost";
import { DisableNumberInputWheel } from "@/components/DisableNumberInputWheel";
import { getSession } from "@/lib/auth";
import "./globals.css";

const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "VIS Lab Tracker",
  description: "Science department inventory tracker for VIS",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.png", type: "image/png", sizes: "32x32" },
      { url: "/icon-192.png", type: "image/png", sizes: "192x192" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover" as const,
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const user = await getSession();

  return (
    <html
      lang="en"
      className={`${figtree.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <NavigationProgressHost />
        <DisableNumberInputWheel />
        <div className="page-shell page-shell--wide">
          <SiteHeader user={user} />
          {children}
        </div>
      </body>
    </html>
  );
}
