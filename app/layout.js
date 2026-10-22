import "./globals.css";
import { getLang } from "@/lib/i18n";
import MenuCloser from "@/components/MenuCloser";

export const metadata = {
  title: "UZLITR Billing",
  description: "UZLITR suv hisoblagichlari va Vodokanal o'rtasidagi ma'lumotlar ko'prigi",
  icons: { icon: "/logo.svg" }
};

export default function RootLayout({ children }) {
  return (
    <html lang={getLang()}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Onest:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" />
      </head>
      <body>{children}<MenuCloser /></body>
    </html>
  );
}
