"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import FormField from "@/components/common/form-field";
import { useAuth } from "@/lib/auth";
import { useSupporterSignupFlow } from "@/lib/auth/SupporterSignupFlowContext";
import VietnamLocationFields from "@/components/location/VietnamLocationFields";
import { formatVietnamLocationLabel } from "@/lib/api/vietnam-location";
import type { VietnamLocationValue } from "@/types/location";

export default function SupporterSignupPage() {
	const router = useRouter();
	const { currentUser } = useAuth();
	const { draft, saveDraft } = useSupporterSignupFlow();
	const [formData, setFormData] = useState({
		name: draft?.name ?? "",
		email: draft?.email ?? "",
		password: draft?.password ?? "",
	});
	const [locationValue, setLocationValue] = useState<VietnamLocationValue>(draft?.locationSelection ?? {});
	const [showErrors, setShowErrors] = useState(false);

	const nameError =
		formData.name.trim().length === 0
			? "Full name is required."
			: formData.name.trim().length < 2
				? "Full name must be at least 2 characters."
				: null;
	const emailError = formData.email.trim().length === 0 ? "Email is required." : null;
	const passwordError =
		formData.password.length === 0 ? "Password is required." : formData.password.length < 8 ? "Password must be at least 8 characters." : null;
	const hasErrors = Boolean(nameError || emailError || passwordError);

	useEffect(() => {
		if (!currentUser) {
			return;
		}

		router.replace(currentUser.role === "organization" ? "/organization" : "/supporter");
		router.refresh();
	}, [currentUser, router]);

	const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setShowErrors(true);

		if (hasErrors) {
			return;
		}

		saveDraft({
			name: formData.name.trim(),
			email: formData.email.trim(),
			password: formData.password,
			location: formatVietnamLocationLabel(locationValue) || undefined,
			locationSelection: locationValue,
			supportTypes: draft?.supportTypes ?? [],
		});

		router.push("/signup/supporter/support-types");
	};

	return (
		<div className="min-h-screen flex items-center justify-center bg-page p-4">
			<div className="card-base p-8 w-full max-w-2xl">
				<div className="mb-6">
					<p className="text-sm font-medium uppercase tracking-[0.2em] text-supporter">Step 1 of 2</p>
					<h1 className="mt-2 text-3xl font-bold text-heading">Join as Supporter</h1>
					<p className="mt-2 text-body">Create your account first, then choose how you want to support.</p>
				</div>

				<form onSubmit={handleSubmit} className="space-y-4">
					<FormField
						label="Full Name"
						required
						error={showErrors ? nameError : null}
					>
						<input
							type="text"
							required
							value={formData.name}
							onChange={(event) => setFormData((prev) => ({ ...prev, name: event.target.value }))}
							className="input-base"
							placeholder="Your name"
						/>
					</FormField>

					<FormField
						label="Email"
						required
						error={showErrors ? emailError : null}
					>
						<input
							type="email"
							required
							value={formData.email}
							onChange={(event) => setFormData((prev) => ({ ...prev, email: event.target.value }))}
							className="input-base"
							placeholder="your@email.com"
						/>
					</FormField>

					<FormField
						label="Password"
						required
						helper="Max 72 bytes (bcrypt limit)."
						error={showErrors ? passwordError : null}
					>
						<input
							type="password"
							required
							minLength={8}
							maxLength={72}
							value={formData.password}
							onChange={(event) => setFormData((prev) => ({ ...prev, password: event.target.value }))}
							className="input-base"
							placeholder="At least 8 characters"
						/>
					</FormField>

					<VietnamLocationFields
						value={locationValue}
						onChange={setLocationValue}
						helperText="Shared Vietnam administrative data. We store ward, district, and province as your profile location."
					/>

					<button type="submit" className="btn-base w-full bg-supporter text-white justify-center">
						Continue
					</button>
				</form>
			</div>
		</div>
	);
}
