import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { Toaster } from "sonner";
import { DemoProvider } from "@/components/demo-provider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-plus-jakarta",
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jetbrains-mono",
});

export const metadata: Metadata = {
  title: {
    default: "Sejuk Sejuk Service Sdn Bhd",
    template: "%s | Sejuk Sejuk Service Sdn Bhd",
  },
  description: "Field service operations for Sejuk Sejuk Service Sdn Bhd",
  icons: { icon: "/icon.svg" },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body
        suppressHydrationWarning
        className={`${inter.variable} ${plusJakarta.variable} ${jetBrainsMono.variable}`}
      >
        <DemoProvider>{children}</DemoProvider>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
