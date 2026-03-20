import Container from "@/components/common/container";
import SectionTitle from "@/components/common/section-title";
import TransparencySummary from "@/components/transparency/transparency-summary";
import { transparencyLogs } from "@/mocks/transparency";

export default function TransparencyPage() {
  return (
    <div className="py-10">
      <Container>
        <SectionTitle
          title="Transparency Page"
          description="Transparency should be visible in the workflow, not handled outside the system."
        />

        <TransparencySummary logs={transparencyLogs} />
      </Container>
    </div>
  );
}	