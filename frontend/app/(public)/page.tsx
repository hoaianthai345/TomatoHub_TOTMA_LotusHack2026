import Link from "next/link";
import Container from "@/components/common/container";
import SectionTitle from "@/components/common/section-title";
import CampaignCard from "@/components/campaign/campaign-card";
import { campaigns } from "@/mocks/campaigns";

export default function HomePage() {
	const featuredCampaigns = campaigns.slice(0, 2);

	return (
		<div className="py-10">
			<Container>
				<section className="rounded-3xl bg-red-600 px-6 py-12 text-white md:px-10">
					<p className="text-sm font-medium uppercase tracking-[0.2em] text-red-100">TomatoHub MVP</p>
					<h1 className="mt-4 max-w-3xl text-4xl font-bold leading-tight">
						Volunteer & Aid Coordination Platform built for clear flow and transparency
					</h1>
					<p className="mt-4 max-w-2xl text-red-50">
						Organizations create campaigns. Supporters contribute through money, goods, volunteering, shipping, or coordination.
						Beneficiary support is tracked inside the system.
					</p>

					<div className="mt-6 flex flex-wrap gap-3">
						<Link href="/campaigns" className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-red-600">
							Explore campaigns
						</Link>
						<Link href="/organization" className="rounded-xl border border-white/40 px-5 py-3 text-sm font-semibold text-white">
							Organization dashboard
						</Link>
					</div>
				</section>

				<section className="mt-12">
					<SectionTitle
						title="Featured Campaigns"
						description="Start with realistic mock campaigns so the team can visualize the MVP flow early."
					/>
					<div className="grid gap-6 md:grid-cols-2">
						{featuredCampaigns.map((campaign) => (
							<CampaignCard key={campaign.id} campaign={campaign} />
						))}
					</div>
				</section>
			</Container>
		</div>
	);
}
