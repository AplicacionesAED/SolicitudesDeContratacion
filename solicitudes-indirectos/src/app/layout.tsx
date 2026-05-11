import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/shared/layout/providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Solicitudes Indirectos — Baia Kristal",
  description: "Sistema de gestión de solicitudes de contratación indirecta",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="h-full" suppressHydrationWarning>
      <body className={`${inter.className} min-h-full bg-gray-50 antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
