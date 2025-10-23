"use client";
import { Geist, Geist_Mono } from "next/font/google";
import "../globals.css";
import { UserProvider } from "@auth0/nextjs-auth0/client";
import ProtectedLayout from "@/components/layouts/ProtectedLayout";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootProtectedLayout({ children }) {
  return (
    <html lang="en">
      <UserProvider>
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
          <ProtectedLayout>{children}</ProtectedLayout>
        </body>
      </UserProvider>
    </html>
  );
}
