import Container from "@/components/common/container";
import SectionTitle from "@/components/common/section-title";
import { beneficiaries } from "@/mocks/beneficiaries";

export default function BeneficiariesPage() {
	return (
		<div className="py-10">
			<Container>
				<SectionTitle title="Beneficiary Management" description="Beneficiaries are mainly managed by Organization in MVP." />

				<div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
					<table className="w-full text-left text-sm">
						<thead className="bg-gray-50 text-gray-600">
							<tr>
								<th className="px-4 py-3">Name</th>
								<th className="px-4 py-3">Location</th>
								<th className="px-4 py-3">Campaign</th>
								<th className="px-4 py-3">Status</th>
							</tr>
						</thead>
						<tbody>
							{beneficiaries.map((item) => (
								<tr key={item.id} className="border-t border-gray-200">
									<td className="px-4 py-3">{item.fullName}</td>
									<td className="px-4 py-3">{item.location}</td>
									<td className="px-4 py-3">{item.campaignId}</td>
									<td className="px-4 py-3">{item.status}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</Container>
		</div>
	);
}
