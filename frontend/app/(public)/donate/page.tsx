import Container from "@/components/common/container";
import SectionTitle from "@/components/common/section-title";

export default function DonatePage() {
	return (
		<div className="py-10">
			<Container>
				<SectionTitle title="Donation Form" description="Prototype form for money or goods donation." />

				<div className="max-w-2xl card-base p-6">
					<form className="space-y-4">
						<div>
							<label className="mb-2 block text-sm font-medium text-text">Full name</label>
							<input
								type="text"
								className="input-base"
								placeholder="Enter your name"
							/>
						</div>

						<div>
							<label className="mb-2 block text-sm font-medium text-text">Support type</label>
							<select className="input-base">
								<option>donor_money</option>
								<option>donor_goods</option>
							</select>
						</div>

						<div>
							<label className="mb-2 block text-sm font-medium text-text">Amount / Item note</label>
							<input
								type="text"
								className="input-base"
								placeholder="Example: 500000 or 10 food packs"
							/>
						</div>

						<button type="submit" className="btn-base btn-primary w-full">
							Submit
						</button>
					</form>
				</div>
			</Container>
		</div>
	);
}
