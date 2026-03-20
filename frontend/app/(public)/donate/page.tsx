import Container from "@/components/common/container";
import SectionTitle from "@/components/common/section-title";

export default function DonatePage() {
	return (
		<div className="py-10">
			<Container>
				<SectionTitle title="Donation Form" description="Prototype form for money or goods donation." />

				<div className="max-w-2xl rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
					<form className="space-y-4">
						<div>
							<label className="mb-2 block text-sm font-medium text-gray-700">Full name</label>
							<input
								type="text"
								className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-red-500"
								placeholder="Enter your name"
							/>
						</div>

						<div>
							<label className="mb-2 block text-sm font-medium text-gray-700">Support type</label>
							<select className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-red-500">
								<option>donor_money</option>
								<option>donor_goods</option>
							</select>
						</div>

						<div>
							<label className="mb-2 block text-sm font-medium text-gray-700">Amount / Item note</label>
							<input
								type="text"
								className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-red-500"
								placeholder="Example: 500000 or 10 food packs"
							/>
						</div>

						<button type="submit" className="rounded-xl bg-red-600 px-5 py-3 text-sm font-semibold text-white">
							Submit
						</button>
					</form>
				</div>
			</Container>
		</div>
	);
}
