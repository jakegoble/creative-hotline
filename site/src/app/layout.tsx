import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/sidebar";
import { RouteProgress } from "@/components/layout/route-progress";
import { DataProvider } from "@/lib/data-context";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

const initialDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE !== "false";

export const metadata: Metadata = {
  title: "Creative Hotline — Command Center",
  description: "Strategic intelligence dashboard for The Creative Hotline",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} antialiased`}>
        <DataProvider initialDemoMode={initialDemoMode}>
          <RouteProgress />
          <div className="flex h-screen overflow-hidden">
            <Sidebar />
            <main className="flex-1 overflow-y-auto overflow-x-hidden">
              <div className="mx-auto max-w-[1200px] px-4 py-4 md:px-6 md:py-6 pt-16 md:pt-6">
                {children}
              </div>
            </main>
          </div>
        </DataProvider>
      </body>
    </html>
  );
}
