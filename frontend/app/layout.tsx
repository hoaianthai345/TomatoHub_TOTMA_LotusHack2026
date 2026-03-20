import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/common/navbar";

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
      <body className="bg-gray-50 text-gray-900">
        <Navbar />
        <main>{children}</main>
      </body>
    </html>
  );
}