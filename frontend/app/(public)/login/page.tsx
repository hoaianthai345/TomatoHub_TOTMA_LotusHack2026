"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthApiError } from "@/lib/auth/api";
import { useAuth } from "@/lib/auth";

function isSafeNextPath(value: string): boolean {
	return value.startsWith("/") && !value.startsWith("//");
}

export default function LoginPage() {
	const router = useRouter();
	const { login, isLoading } = useAuth();
	const [formData, setFormData] = useState({
		email: "",
		password: "",
	});
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [nextPath] = useState<string | null>(() => {
		if (typeof window === "undefined") {
			return null;
		}
		const params = new URLSearchParams(window.location.search);
		const next = params.get("next");
		return next && isSafeNextPath(next) ? next : null;
	});

	const handleSubmit = async (event: React.FormEvent) => {
		event.preventDefault();
		setErrorMessage(null);

		try {
			const user = await login({
				email: formData.email,
				password: formData.password,
			});
			if (nextPath && isSafeNextPath(nextPath)) {
				router.push(nextPath);
				return;
			}
			router.push(user.role === "organization" ? "/organization" : "/supporter");
		} catch (error) {
			if (error instanceof AuthApiError) {
				setErrorMessage(error.message);
			} else {
				setErrorMessage("Login failed. Please try again.");
			}
		}
	};

	return (
		<div className="min-h-screen flex items-center justify-center bg-page p-4">
			<div className="card-base p-8 w-full max-w-md">
				<h1 className="text-3xl font-bold text-center mb-2 text-heading">Welcome back</h1>
				<p className="text-center text-body mb-8">Sign in to continue to your dashboard</p>

				<form onSubmit={handleSubmit} className="space-y-4">
					<div>
						<label className="label-text block mb-1">Email</label>
						<input
							type="email"
							required
							className="input-base"
							placeholder="you@example.com"
							value={formData.email}
							onChange={(event) => setFormData((prev) => ({ ...prev, email: event.target.value }))}
						/>
					</div>

					<div>
						<label className="label-text block mb-1">Password</label>
						<input
							type="password"
							required
							maxLength={72}
							className="input-base"
							placeholder="Your password"
							value={formData.password}
							onChange={(event) => setFormData((prev) => ({ ...prev, password: event.target.value }))}
						/>
					</div>

					{errorMessage ? <p className="rounded-lg border border-danger/20 bg-danger/5 p-3 text-sm text-danger">{errorMessage}</p> : null}

					<button type="submit" disabled={isLoading} className="btn-base w-full btn-primary disabled:opacity-50 justify-center">
						{isLoading ? "Logging in..." : "Sign in"}
					</button>
					<div className="mt-2 flex gap-2 text-text-muted">
						<div className="min-w-[180px] flex-1 rounded-md">
							<p className="font-medium text-sm text-body">Demo account</p>
							<p className="text-xs">Email: nguyen.tuan@example.com</p>
							<p className="text-xs">Password: Supporter@123</p>
						</div>

						<div className="min-w-[180px] flex-1 rounded-md">
							<p className="font-medium text-sm text-body">Organization</p>
							<p className="text-xs">Email: info@tomatorelief.org</p>
							<p className="text-xs">Password: Org@123456</p>
						</div>
					</div>
				</form>

				<div className="relative my-6">
					<div className="absolute inset-0 flex items-center">
						<div className="w-full border-t border-main"></div>
					</div>
					<div className="relative flex justify-center text-sm">
						<span className="px-2 bg-page text-muted">Don&apos;t have account?</span>
					</div>
				</div>

				<Link href="/signup" className="btn-base w-full btn-secondary justify-center">
					Create new account
				</Link>
			</div>
		</div>
	);
}
