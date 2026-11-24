import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { InstallAppProvider } from "@/components/shared/install-app-provider";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  applicationName: "TE",
  title: {
    default: "TE",
    template: "%s · TE",
  },
  description: "Sistem manajemen klub renang dan finswimming.",
  icons: {
    icon: [{ url: "/icons/te.svg", type: "image/svg+xml", sizes: "any" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    title: "TE",
    statusBarStyle: "default",
  },
  // Aplikasi privat untuk anggota klub: jangan diindeks mesin pencari.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
  themeColor: "#0b6fa4",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${jakarta.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-dvh flex-col">
        <InstallAppProvider>
          {children}
          <Toaster position="top-center" richColors closeButton />
        </InstallAppProvider>
      </body>
    </html>
  );
}
