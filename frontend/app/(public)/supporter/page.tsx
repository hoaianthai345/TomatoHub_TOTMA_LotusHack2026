import Container from "@/components/common/container";
import SectionTitle from "@/components/common/section-title";

export default function SupporterPage() {
	return (
		<div className="py-10">
			<Container>
				<SectionTitle title="Supporter Registration" description="One user can support in multiple ways depending on product logic." />

				<div className="max-w-2xl card-base p-6">
					<form className="space-y-4">
						<div>
							<label className="mb-2 block text-sm font-medium text-text">Full name</label>
							<input type="text" className="input-base" placeholder="Enter full name" />
						</div>

						<div>
							<label className="mb-2 block text-sm font-medium text-text">Support types</label>
							<div className="grid gap-3 sm:grid-cols-2">
								{["donor_money", "donor_goods", "volunteer", "shipper", "coordinator"].map((type) => (
									<label key={type} className="flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-3 text-sm cursor-pointer hover:bg-surface-muted transition-colors">
										<input type="checkbox" className="accent-primary" />
										<span className="text-text">{type}</span>
									</label>
								))}
							</div>
						</div>

						<button type="submit" className="btn-base btn-primary w-full">
							Register
						</button>
					</form>
				</div>
			</Container>
		</div>
	);
}
