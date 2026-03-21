"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
					<div>
						<label className="label-text block mb-1">Full Name</label>
						<input
							type="text"
							required
							value={formData.name}
							onChange={(event) => setFormData((prev) => ({ ...prev, name: event.target.value }))}
							className="input-base"
							placeholder="Your name"
						/>
						{showErrors && nameError ? <p className="mt-1 text-xs text-danger">{nameError}</p> : null}
					</div>

					<div>
						<label className="label-text block mb-1">Email</label>
						<input
							type="email"
							required
							value={formData.email}
							onChange={(event) => setFormData((prev) => ({ ...prev, email: event.target.value }))}
							className="input-base"
							placeholder="your@email.com"
						/>
						{showErrors && emailError ? <p className="mt-1 text-xs text-danger">{emailError}</p> : null}
					</div>

					<div>
						<label className="label-text block mb-1">Password</label>
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
						<p className="mt-1 text-xs text-text-muted">Max 72 bytes (bcrypt limit).</p>
						{showErrors && passwordError ? <p className="mt-1 text-xs text-danger">{passwordError}</p> : null}
					</div>

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
