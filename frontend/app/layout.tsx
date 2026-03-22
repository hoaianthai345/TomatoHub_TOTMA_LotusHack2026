import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import Navbar from "@/components/common/navbar";
import ScrollToTopOnRouteChange from "@/components/common/scroll-to-top-on-route-change";
import TopProgressBar from "@/components/loading/top-progress-bar";
import { AuthProvider } from "@/lib/auth";

export const metadata: Metadata = {
  title: "TomatoHub",
  description: "Volunteer & Aid Coordination Platform",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-page text-heading">
        <AuthProvider>
          <Suspense fallback={null}>
            <ScrollToTopOnRouteChange />
          </Suspense>
          <Suspense fallback={null}>
            <TopProgressBar />
          </Suspense>
          <Navbar />
          <main>{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
