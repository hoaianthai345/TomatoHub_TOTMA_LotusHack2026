import { notFound } from "next/navigation";
import Container from "@/components/common/container";
import CampaignDetailHero from "@/components/campaign/campaign-detail-hero";
import SectionTitle from "@/components/common/section-title";
import { campaigns } from "@/mocks/campaigns";

interface CampaignDetailPageProps {
	params: Promise<{
		id: string;
	}>;
}

export default async function CampaignDetailPage({ params }: CampaignDetailPageProps) {
	const { id } = await params;

	const campaign = campaigns.find((item) => item.slug === id);

	if (!campaign) {
		notFound();
	}

	return (
		<div className="py-10">
			<Container>
				<CampaignDetailHero campaign={campaign} />

				<section className="mt-10 grid gap-8 lg:grid-cols-[2fr_1fr]">
					<div>
						<SectionTitle title="Current Needs" description="Needs are updated by Organization and visible to supporters." />
						<div className="grid gap-4 sm:grid-cols-2">
							{campaign.needs.map((need) => (
								<div key={need.label} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
									<p className="text-sm text-gray-500">{need.label}</p>
									<p className="mt-2 text-lg font-semibold text-gray-900">{need.value}</p>
								</div>
							))}
						</div>
					</div>

					<div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
						<h3 className="text-lg font-semibold text-gray-900">Support this campaign</h3>
						<p className="mt-2 text-sm text-gray-600">
							Choose support type: donor money, donor goods, volunteer, shipper, or coordinator.
						</p>

						<div className="mt-5 space-y-3">
							<button className="w-full rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white">Donate money</button>
							<button className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-800">
								Register as supporter
							</button>
						</div>
					</div>
				</section>
			</Container>
		</div>
	);
}
