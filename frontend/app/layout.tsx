import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/common/navbar";
import { AuthProvider } from "@/lib/auth";

export const metadata: Metadata = {
  title: "TomatoHub",
  description: "Volunteer & Aid Coordination Platform",
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
          <Navbar />
          <main>{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
