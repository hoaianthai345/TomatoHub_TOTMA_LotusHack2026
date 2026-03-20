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
              className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
            >
              <h3 className="font-semibold text-gray-900">{item.fullName}</h3>
              <p className="mt-1 text-sm text-gray-600">{item.location}</p>
              <p className="mt-2 text-sm text-gray-700">
                Support types: {item.supportTypes.join(", ")}
              </p>
            </div>
          ))}
        </div>
      </Container>
    </div>
  );
}