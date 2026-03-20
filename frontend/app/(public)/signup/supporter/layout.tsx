import { SupporterSignupFlowProvider } from "@/lib/auth/SupporterSignupFlowContext";

export default function SupporterSignupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SupporterSignupFlowProvider>{children}</SupporterSignupFlowProvider>;
}
