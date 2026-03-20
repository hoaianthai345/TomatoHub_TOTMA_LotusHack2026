import Container from "@/components/common/container";
import SectionTitle from "@/components/common/section-title";

export default function ProfilePage() {
  return (
    <div className="py-10">
      <Container>
        <SectionTitle
          title="Profile"
          description="Prototype profile page for supporter contribution history."
        />

        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-gray-700">Support history and participation status will be shown here.</p>
        </div>
      </Container>
    </div>
  );
}