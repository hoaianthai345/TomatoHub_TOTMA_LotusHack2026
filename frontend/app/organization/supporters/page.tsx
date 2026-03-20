import Container from "@/components/common/container";
import SectionTitle from "@/components/common/section-title";
import { supporters } from "@/mocks/supporters";

export default function SupportersPage() {
  return (
    <div className="py-10">
      <Container>
        <SectionTitle
          title="Supporter Management"
          description="Track supporter types and participation at organization level."
        />

        <div className="grid gap-4">
          {supporters.map((item) => (
            <div
              key={item.id}
              className="card-base p-5"
            >
              <h3 className="font-semibold text-heading">{item.fullName}</h3>
              <p className="mt-1 text-sm text-text-muted">{item.location}</p>
              <p className="mt-2 text-sm text-text">
                Support types: <span className="font-medium">{item.supportTypes.join(", ")}</span>
              </p>
            </div>
          ))}
        </div>
      </Container>
    </div>
  );
}