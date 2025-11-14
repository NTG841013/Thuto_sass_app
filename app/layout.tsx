import type { Metadata } from "next";
import { Bricolage_Grotesque } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import {
    ClerkProvider,
} from '@clerk/nextjs'

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Thuto",
  description: "AI-Assisted Real-Time Learning Framework",
};

export default function RootLayout({
                                       children,
                                   }: Readonly<{
    children: React.ReactNode;
}>) {
    // Suppress Daily.co transport warnings in development
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
        const originalError = console.error;
        console.error = (...args) => {
            if (
                args[0]?.includes?.('transport') &&
                args[0]?.includes?.('disconnected')
            ) {
                return; // Suppress transport disconnect messages
            }
            originalError.apply(console, args);
        };
    }

    return (
        <html lang="en">
        <body className={`${bricolage.variable} antialiased`}>
        <ClerkProvider appearance={{variables: {colorPrimary: '#fe5933'}}}>
            <Navbar/>
            {children}
        </ClerkProvider>
        </body>
        </html>
    );
}