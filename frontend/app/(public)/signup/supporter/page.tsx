"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSupporterSignupFlow } from "@/lib/auth/SupporterSignupFlowContext";
import VietnamLocationFields from "@/components/location/VietnamLocationFields";
import { formatVietnamLocationLabel } from "@/lib/api/vietnam-location";
import type { VietnamLocationValue } from "@/types/location";

export default function SupporterSignupPage() {
  const router = useRouter();
  const { draft, saveDraft } = useSupporterSignupFlow();
  const [formData, setFormData] = useState({
    name: draft?.name ?? "",
    email: draft?.email ?? "",
    password: draft?.password ?? "",
  });
  const [locationValue, setLocationValue] = useState<VietnamLocationValue>(
    draft?.locationSelection ?? {}
  );

  const canContinue = useMemo(
    () =>
      formData.name.trim().length >= 2 &&
      formData.email.trim().length > 0 &&
      formData.password.trim().length >= 8,
    [formData.email, formData.name, formData.password]
  );

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

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
      <div className="card-base p-8 w-full max-w-md">
        <div className="mb-6">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-supporter">
            Step 1 of 2
          </p>
          <h1 className="mt-2 text-3xl font-bold text-heading">
            Join as Supporter
          </h1>
          <p className="mt-2 text-body">
            Create your account first, then choose how you want to support.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label-text block mb-1">Full Name</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(event) =>
                setFormData((prev) => ({ ...prev, name: event.target.value }))
              }
              className="input-base"
              placeholder="Your name"
            />
          </div>

          <div>
            <label className="label-text block mb-1">Email</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(event) =>
                setFormData((prev) => ({ ...prev, email: event.target.value }))
              }
              className="input-base"
              placeholder="your@email.com"
            />
          </div>

          <div>
            <label className="label-text block mb-1">Password</label>
            <input
              type="password"
              required
              minLength={8}
              value={formData.password}
              onChange={(event) =>
                setFormData((prev) => ({ ...prev, password: event.target.value }))
              }
              className="input-base"
              placeholder="At least 8 characters"
            />
          </div>

          <VietnamLocationFields
            value={locationValue}
            onChange={setLocationValue}
            helperText="Shared Vietnam administrative data. We store ward, district, and province as your profile location."
          />

          <button
            type="submit"
            disabled={!canContinue}
            className="btn-base w-full bg-supporter text-white disabled:opacity-50 justify-center"
          >
            Continue
          </button>
        </form>
      </div>
    </div>
  );
}
