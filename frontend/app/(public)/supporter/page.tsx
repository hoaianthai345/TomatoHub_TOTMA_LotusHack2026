import Container from "@/components/common/container";
import SectionTitle from "@/components/common/section-title";

export default function SupporterPage() {
	return (
		<div className="py-10">
			<Container>
				<SectionTitle title="Supporter Registration" description="One user can support in multiple ways depending on product logic." />

				<div className="max-w-2xl rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
					<form className="space-y-4">
						<div>
							<label className="mb-2 block text-sm font-medium text-gray-700">Full name</label>
							<input type="text" className="w-full rounded-xl border border-gray-300 px-4 py-3" placeholder="Enter full name" />
						</div>

						<div>
							<label className="mb-2 block text-sm font-medium text-gray-700">Support types</label>
							<div className="grid gap-3 sm:grid-cols-2">
								{["donor_money", "donor_goods", "volunteer", "shipper", "coordinator"].map((type) => (
									<label key={type} className="flex items-center gap-2 rounded-xl border border-gray-300 px-4 py-3 text-sm">
										<input type="checkbox" />
										<span>{type}</span>
									</label>
								))}
							</div>
						</div>

						<button type="submit" className="rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white">
							Register
						</button>
					</form>
				</div>
			</Container>
		</div>
	);
}
