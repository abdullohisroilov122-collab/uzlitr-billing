import "./globals.css";
import { getLang } from "@/lib/i18n";
import MenuCloser from "@/components/MenuCloser";
import SoundEffects from "@/components/SoundEffects";
import { SITE_URL } from "@/lib/site";

const DESCRIPTION = "UZLITRPRO — suv hisoblagichlari ko'rsatkichlari bitta oynada: shaxsiy kabinet, kunlik sarf, hisoblagichni ro'yxatdan o'tkazish.";

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "UZLITRPRO — suv hisoblagichlari kabineti", template: "%s — UZLITRPRO" },
  description: DESCRIPTION,
  applicationName: "UZLITRPRO",
  openGraph: {
    type: "website", siteName: "UZLITRPRO", locale: "uz_UZ", url: "/",
    title: "UZLITRPRO — suv hisoblagichlari kabineti", description: DESCRIPTION,
    images: [{ url: "/brand/uzlitrpro-logo.png", alt: "UZLITRPRO" }]
  },
  // Search Console can also verify by DNS TXT record; this meta tag is used only when the variable is set.
  ...(process.env.GOOGLE_SITE_VERIFICATION && { verification: { google: process.env.GOOGLE_SITE_VERIFICATION } })
};

export default function RootLayout({ children }) {
  return (
    <html lang={getLang()}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Onest:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" />
      </head>
      <body>{children}<MenuCloser /><SoundEffects /></body>
    </html>
  );
}
