"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import VietnamLocationFields from "@/components/location/VietnamLocationFields";
import { AuthApiError } from "@/lib/auth/api";
import { formatVietnamLocationLabel } from "@/lib/api/vietnam-location";
import { useAuth } from "@/lib/auth";
import type { VietnamLocationValue } from "@/types/location";

export default function OrganizationSignupPage() {
  const router = useRouter();
  const { signupOrganization, isLoading } = useAuth();
  const [formData, setFormData] = useState({
    name: "",
    representative: "",
    email: "",
    password: "",
    description: "",
  });
  const [locationValue, setLocationValue] = useState<VietnamLocationValue>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    try {
      await signupOrganization({
        name: formData.name,
        representative: formData.representative || formData.name,
        email: formData.email,
        password: formData.password,
        location: formatVietnamLocationLabel(locationValue) || undefined,
        description: formData.description,
      });
      router.push("/organization");
    } catch (error) {
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
        <h1 className="text-3xl font-bold mb-2 text-heading">
          Join as Organization
        </h1>
        <p className="text-body mb-6">
          Create your organization and start managing campaigns
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Organization Name */}
          <div>
            <label className="label-text block mb-1">
              Organization Name
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              className="input-base"
              placeholder="Organization name"
            />
          </div>

          {/* Representative Name */}
          <div>
            <label className="label-text block mb-1">
              Representative Name
            </label>
            <input
              type="text"
              value={formData.representative}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  representative: e.target.value,
                }))
              }
              className="input-base"
              placeholder="Your name"
            />
          </div>

          {/* Email */}
          <div>
            <label className="label-text block mb-1">
              Email
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, email: e.target.value }))
              }
              className="input-base"
              placeholder="org@email.com"
            />
          </div>

          {/* Password */}
          <div>
            <label className="label-text block mb-1">
              Password
            </label>
            <input
              type="password"
              required
              minLength={8}
              maxLength={72}
              value={formData.password}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, password: e.target.value }))
              }
              className="input-base"
              placeholder="At least 8 characters"
            />
            <p className="mt-1 text-xs text-text-muted">
              Max 72 bytes (bcrypt limit).
            </p>
          </div>

          <VietnamLocationFields
            value={locationValue}
            onChange={setLocationValue}
            helperText="Use the shared Vietnam administrative dataset so organization locations stay consistent across forms."
          />

          {/* Description */}
          <div>
            <label className="label-text block mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              className="input-base"
              placeholder="Tell us about your organization"
              rows={3}
            />
          </div>

          {errorMessage ? (
            <p className="rounded-lg border border-danger/20 bg-danger/5 p-3 text-sm text-danger">
              {errorMessage}
            </p>
          ) : null}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="btn-base w-full bg-org text-white disabled:opacity-50 mt-6 justify-center"
          >
            {isLoading ? "Creating account..." : "Create Account"}
          </button>
        </form>
      </div>
    </div>
  );
}
