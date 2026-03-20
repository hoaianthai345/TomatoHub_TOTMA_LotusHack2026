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

        <div className="max-w-3xl card-base p-6">
          <form className="grid gap-4">
            <input
              className="input-base"
              placeholder="Campaign title"
            />
            <input
              className="input-base"
              placeholder="Location"
            />
            <textarea
              className="min-h-36 input-base"
              placeholder="Campaign description"
            />
            <button className="w-fit btn-base btn-primary">
              Create
            </button>
          </form>
        </div>
      </Container>
    </div>
  );
}