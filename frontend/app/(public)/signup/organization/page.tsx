"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import FormField from "@/components/common/form-field";
import StatePanel from "@/components/common/state-panel";
import VietnamLocationFields from "@/components/location/VietnamLocationFields";
import { AuthApiError } from "@/lib/auth/api";
import { formatVietnamLocationLabel } from "@/lib/api/vietnam-location";
import { useAuth } from "@/lib/auth";
import type { VietnamLocationValue } from "@/types/location";

export default function OrganizationSignupPage() {
  const router = useRouter();
  const { currentUser, signupOrganization, isLoading } = useAuth();
  const [formData, setFormData] = useState({
    name: "",
    representative: "",
    email: "",
    password: "",
    description: "",
  });
  const [locationValue, setLocationValue] = useState<VietnamLocationValue>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    router.replace(currentUser.role === "organization" ? "/organization" : "/supporter");
    router.refresh();
  }, [currentUser, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    try {
      const user = await signupOrganization({
        name: formData.name,
        representative: formData.representative || formData.name,
        email: formData.email,
        password: formData.password,
        location: formatVietnamLocationLabel(locationValue) || undefined,
        description: formData.description,
      });
      router.replace(user.role === "organization" ? "/organization" : "/supporter");
      router.refresh();
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
      <div className="card-base p-8 w-full max-w-2xl">
        <h1 className="text-3xl font-bold mb-2 text-heading">
          Join as Organization
        </h1>
        <p className="text-body mb-6">
          Create your organization and start managing campaigns
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Organization Name" required>
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
          </FormField>

          <FormField label="Representative Name">
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
          </FormField>

          <FormField label="Email" required>
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
          </FormField>

          <FormField label="Password" required>
            <input
              type="password"
              required
              minLength={8}
              value={formData.password}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, password: e.target.value }))
              }
              className="input-base"
              placeholder="At least 8 characters"
            />
          </FormField>

          <VietnamLocationFields
            value={locationValue}
            onChange={setLocationValue}
            helperText="Use the shared Vietnam administrative dataset so organization locations stay consistent across forms."
          />

          <FormField label="Description">
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
          </FormField>

          {errorMessage ? (
            <StatePanel variant="error" message={errorMessage} />
          ) : null}

          <button
            type="submit"
            disabled={isLoading}
            className="btn-base btn-primary w-full disabled:opacity-50 mt-6 justify-center"
          >
            {isLoading ? "Creating account..." : "Create Account"}
          </button>
        </form>
      </div>
    </div>
  );
}
