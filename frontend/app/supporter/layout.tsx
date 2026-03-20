import SupporterLayout from "@/components/layouts/SupporterLayout";

export default function SupporterRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SupporterLayout>{children}</SupporterLayout>;
}
