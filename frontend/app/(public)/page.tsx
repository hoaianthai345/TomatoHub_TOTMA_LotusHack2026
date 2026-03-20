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
				{/* Sử dụng ngay biến màu từ @theme: bg-primary */}
				<section className="rounded-3xl bg-primary px-6 py-12 text-white md:px-10 shadow-pop">
					<p className="text-sm font-medium uppercase tracking-[0.2em] opacity-80">TomatoHub MVP</p>
					
					{/* Ví dụ áp dụng các biến trực tiếp hoặc kết hợp với utility của framework */}
					<h1 className="mt-4 max-w-3xl text-4xl font-bold leading-tight">
						Volunteer & Aid Coordination Platform built for clear flow and transparency
					</h1>
					<p className="mt-4 max-w-2xl opacity-90">
						Organizations create campaigns. Supporters contribute through money, goods, volunteering, shipping, or coordination.
						Beneficiary support is tracked inside the system.
					</p>

					<div className="mt-8 flex flex-wrap gap-4">
						{/* Dùng base @utility btn-base và btn-secondary đã khai báo ở globals.css */}
						<Link href="/campaigns" className="btn-base bg-white text-primary hover:bg-surface-muted shadow-soft">
							Explore campaigns
						</Link>
						<Link href="/organization" className="btn-base border border-white/40 text-white hover:bg-white/10">
							Organization dashboard
						</Link>
					</div>
				</section>

				<section className="mt-16">
					<SectionTitle
						title="Featured Campaigns"
						description="Start with realistic mock campaigns so the team can visualize the MVP flow early."
					/>
					{/* Giả sử CampaignCard ở trong dùng các thuộc tính base/hover */}
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
