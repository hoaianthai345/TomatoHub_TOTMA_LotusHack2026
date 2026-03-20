import Container from "@/components/common/container";
import SectionTitle from "@/components/common/section-title";
import { beneficiaries } from "@/mocks/beneficiaries";

export default function BeneficiariesPage() {
	return (
		<div className="py-10">
			<Container>
				<SectionTitle title="Beneficiary Management" description="Beneficiaries are mainly managed by Organization in MVP." />

				<div className="overflow-hidden card-base">
					<table className="w-full text-left text-sm">
						<thead className="bg-surface-muted text-text-muted">
							<tr>
								<th className="px-4 py-3 font-semibold">Name</th>
								<th className="px-4 py-3 font-semibold">Location</th>
								<th className="px-4 py-3 font-semibold">Campaign</th>
								<th className="px-4 py-3 font-semibold">Status</th>
							</tr>
						</thead>
						<tbody>
							{beneficiaries.map((item) => (
								<tr key={item.id} className="border-t border-border hover:bg-surface-muted/50 transition-colors">
									<td className="px-4 py-3 font-medium text-heading">{item.fullName}</td>
									<td className="px-4 py-3 text-text">{item.location}</td>
									<td className="px-4 py-3 text-text">{item.campaignId}</td>
									<td className="px-4 py-3">
										<span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
											{item.status}
										</span>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</Container>
		</div>
	);
}
