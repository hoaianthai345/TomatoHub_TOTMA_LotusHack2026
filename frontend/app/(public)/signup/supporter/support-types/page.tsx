"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthApiError } from "@/lib/auth/api";
import { useAuth } from "@/lib/auth";
import { useSupporterSignupFlow } from "@/lib/auth/SupporterSignupFlowContext";
import { SUPPORT_TYPE_OPTIONS } from "@/lib/auth/supportTypes";
import type { SupportType } from "@/types/user";

export default function SupporterSignupSupportTypesPage() {
	const router = useRouter();
	const { currentUser, signupSupporter, isLoading } = useAuth();
	const { draft, saveDraft, clearDraft } = useSupporterSignupFlow();
	const [selectedSupportTypes, setSelectedSupportTypes] = useState<SupportType[]>(draft?.supportTypes ?? []);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [isCompletingSignup, setIsCompletingSignup] = useState(false);

	const goToSupporterDashboard = useCallback(() => {
		if (typeof window !== "undefined") {
			window.location.replace("/supporter");
		}
	}, []);

	useEffect(() => {
		if (!draft && !currentUser && !isCompletingSignup) {
			router.replace("/signup/supporter");
		}
	}, [currentUser, draft, isCompletingSignup, router]);

	useEffect(() => {
		if (!currentUser) {
			return;
		}

		clearDraft();
		goToSupporterDashboard();
	}, [clearDraft, currentUser, goToSupporterDashboard]);

	if (!draft) {
		return null;
	}

	const handleSupportTypeChange = (type: SupportType) => {
		setSelectedSupportTypes((current) => (current.includes(type) ? current.filter((item) => item !== type) : [...current, type]));
	};

	const handleBack = () => {
		saveDraft({
			...draft,
			supportTypes: selectedSupportTypes,
		});
		router.push("/signup/supporter");
	};

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setErrorMessage(null);
		setIsCompletingSignup(true);

		try {
			await signupSupporter({
				name: draft.name,
				email: draft.email,
				password: draft.password,
				location: draft.location,
				supportTypes: selectedSupportTypes.length ? selectedSupportTypes : undefined,
			});
			clearDraft();
			goToSupporterDashboard();
		} catch (error) {
			setIsCompletingSignup(false);
			if (error instanceof AuthApiError) {
				setErrorMessage(error.message);
			} else {
				setErrorMessage("Signup failed. Please try again.");
			}
		}
	};

	return (
		<div className="min-h-screen flex items-center justify-center bg-page p-4">
			<div className="card-base p-8 w-full max-w-md">
				<div className="mb-6">
					<p className="text-sm font-medium uppercase tracking-[0.2em] text-supporter">Step 2 of 2</p>
					<h1 className="mt-2 text-3xl font-bold text-heading">How do you want to support?</h1>
					<p className="mt-2 text-body">This step is optional. You can skip it now and update later.</p>
				</div>

				<form onSubmit={handleSubmit} className="space-y-4">
					<div>
						<label className="label-text block mb-2">Choose one or more support types</label>
						<div className="space-y-2">
							{SUPPORT_TYPE_OPTIONS.map((option) => (
								<label key={option.value} className="flex items-center">
									<input
										type="checkbox"
										checked={selectedSupportTypes.includes(option.value)}
										onChange={() => handleSupportTypeChange(option.value)}
										className="w-4 h-4 rounded"
										style={{ accentColor: "var(--color-supporter)" }}
									/>
									<span className="ml-2 text-body">{option.label}</span>
								</label>
							))}
						</div>
					</div>

					{errorMessage ? <p className="rounded-lg border border-danger/20 bg-danger/5 p-3 text-sm text-danger">{errorMessage}</p> : null}

					<div className="flex gap-3">
						<button type="button" onClick={handleBack} className="btn-base btn-secondary flex-1 justify-center">
							Back
						</button>
						<button
							type="submit"
							disabled={isLoading}
							className="btn-base flex-1 justify-center bg-supporter text-white disabled:opacity-50"
						>
							{isLoading ? "Creating account..." : "Complete Signup"}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
