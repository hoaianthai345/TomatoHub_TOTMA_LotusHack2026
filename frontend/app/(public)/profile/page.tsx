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

        <div className="card-base p-6">
          <p className="text-text">Support history and participation status will be shown here.</p>
        </div>
      </Container>
    </div>
  );
}