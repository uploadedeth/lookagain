/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { MiniKitContextProvider } from "@/providers/MiniKitProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "LookAgain",
  description: "An AI-powered 'Spot the Difference' game. Describe a scene and challenge yourself to find the differences in the generated images.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <MiniKitContextProvider>
          <div id="star-bg">
              <div id="stars1"></div>
              <div id="stars2"></div>
              <div id="stars3"></div>
              <div id="shooting-stars">
                  <div className="star"></div>
                  <div className="star"></div>
                  <div className="star"></div>
                  <div className="star"></div>
              </div>
          </div>
          {children}
        </MiniKitContextProvider>
      </body>
    </html>
  );
}
