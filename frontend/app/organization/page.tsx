"use client";

import Container from "@/components/common/container";
import SectionTitle from "@/components/common/section-title";
import OrgStatCard from "@/components/organization/org-stat-card";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { campaigns } from "@/mocks/campaigns";
import { beneficiaries } from "@/mocks/beneficiaries";
import { supporters } from "@/mocks/supporters";
import { donations } from "@/mocks/donations";

export default function OrganizationDashboardPage() {
  const { currentUser } = useAuth();

  return (
    <div className="py-10">
      <Container>
        <SectionTitle
          title={`${currentUser?.name} Dashboard`}
          description="Main management entry for campaigns, beneficiaries, supporters, donations, and transparency."
        />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <OrgStatCard label="Campaigns" value={campaigns.length} />
          <OrgStatCard label="Beneficiaries" value={beneficiaries.length} />
          <OrgStatCard label="Supporters" value={supporters.length} />
          <OrgStatCard label="Donations" value={donations.length} />
        </div>

        <div className="mt-8 card-base p-6">
          <h3 className="text-lg font-semibold text-heading">Quick actions</h3>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/organization/campaigns/create"
              className="btn-base btn-primary"
            >
              Create campaign
            </Link>
            <Link
              href="/organization/beneficiaries"
              className="btn-base btn-secondary"
            >
              Manage beneficiaries
            </Link>
            <Link
              href="/organization/transparency"
              className="btn-base btn-secondary"
            >
              Publish transparency
            </Link>
          </div>
        </div>
      </Container>
    </div>
  );
}