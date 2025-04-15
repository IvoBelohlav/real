import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/contexts/AuthContext"; // Adjusted path
import { SubscriptionProvider } from "@/contexts/SubscriptionContext"; // Adjusted path
import { Toaster } from 'sonner';
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ChatWidget - AI Customer Support", // Updated title
  description: "Your 24/7 AI Customer Support solution.", // Updated description
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <AuthProvider> {/* AuthProvider wraps SubscriptionProvider */}
          <SubscriptionProvider> {/* Wrap children with SubscriptionProvider */}
            {children}
            <Toaster position="top-right" richColors />
          </SubscriptionProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
