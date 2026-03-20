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
								<div key={need.label} className="card-base p-5 border-border">
									<p className="text-sm text-text-muted">{need.label}</p>
									<p className="mt-2 text-lg font-semibold text-heading">{need.value}</p>
								</div>
							))}
						</div>
					</div>

					<div className="card-base p-6 border-border h-fit sticky top-24">
						<h3 className="text-lg font-semibold text-heading">Support this campaign</h3>
						<p className="mt-2 text-sm text-text-muted">
							Choose support type: donor money, donor goods, volunteer, shipper, or coordinator.
						</p>

						<div className="mt-5 space-y-3">
							<button className="w-full btn-base btn-primary">Donate money</button>
							<button className="w-full btn-base btn-secondary">
								Register as supporter
							</button>
						</div>
					</div>
				</section>
			</Container>
		</div>
	);
}
