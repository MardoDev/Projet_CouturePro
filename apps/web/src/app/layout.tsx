import type { Metadata } from "next";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ChatPlaceholder } from "@/components/chat-placeholder";

export const metadata: Metadata = {
  title: {
    default: "Couture Dynamic Pro — Votre Style Chic",
    template: "%s — Couture Dynamic Pro",
  },
  description: "Plateforme e-commerce Couture Dynamic Pro : collections, catalogues et boutique.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className="flex min-h-screen flex-col font-sans antialiased">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
        <ChatPlaceholder />
      </body>
    </html>
  );
}
