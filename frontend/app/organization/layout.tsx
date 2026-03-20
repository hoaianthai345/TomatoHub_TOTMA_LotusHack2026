import OrganizationLayout from "@/components/layouts/OrganizationLayout";

export default function OrganizationRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <OrganizationLayout>{children}</OrganizationLayout>;
}
