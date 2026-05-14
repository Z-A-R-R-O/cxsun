import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "cxnext",
  description: "Modular monolith platform foundation",
  icons: {
    icon: "/storage/logo/favicon.svg",
    shortcut: "/storage/logo/favicon.svg",
    apple: "/storage/logo/favicon.svg",
  },
};

export default function RootLayout({ children }: { readonly children: ReactNode }) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
