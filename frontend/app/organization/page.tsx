import Container from "@/components/common/container";
import SectionTitle from "@/components/common/section-title";
import OrgStatCard from "@/components/organization/org-stat-card";
import { campaigns } from "@/mocks/campaigns";
import { beneficiaries } from "@/mocks/beneficiaries";
import { supporters } from "@/mocks/supporters";
import { donations } from "@/mocks/donations";

export default function OrganizationDashboardPage() {
  return (
    <div className="py-10">
      <Container>
        <SectionTitle
          title="Organization Dashboard"
          description="Main management entry for campaigns, beneficiaries, supporters, donations, and transparency."
        />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <OrgStatCard label="Campaigns" value={campaigns.length} />
          <OrgStatCard label="Beneficiaries" value={beneficiaries.length} />
          <OrgStatCard label="Supporters" value={supporters.length} />
          <OrgStatCard label="Donations" value={donations.length} />
        </div>

        <div className="mt-8 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900">Quick actions</h3>
          <div className="mt-4 flex flex-wrap gap-3">
            <button className="rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white">
              Create campaign
            </button>
            <button className="rounded-xl border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-800">
              Manage beneficiaries
            </button>
            <button className="rounded-xl border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-800">
              Publish transparency
            </button>
          </div>
        </div>
      </Container>
    </div>
  );
}