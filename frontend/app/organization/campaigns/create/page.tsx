import Container from "@/components/common/container";
import SectionTitle from "@/components/common/section-title";

export default function CreateCampaignPage() {
  return (
    <div className="py-10">
      <Container>
        <SectionTitle
          title="Create Campaign"
          description="Prototype screen for organization campaign creation."
        />

        <div className="max-w-3xl rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <form className="grid gap-4">
            <input
              className="rounded-xl border border-gray-300 px-4 py-3"
              placeholder="Campaign title"
            />
            <input
              className="rounded-xl border border-gray-300 px-4 py-3"
              placeholder="Location"
            />
            <textarea
              className="min-h-36 rounded-xl border border-gray-300 px-4 py-3"
              placeholder="Campaign description"
            />
            <button className="w-fit rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white">
              Create
            </button>
          </form>
        </div>
      </Container>
    </div>
  );
}