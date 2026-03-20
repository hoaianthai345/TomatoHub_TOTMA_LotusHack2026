"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/lib/auth";

export default function OrganizationSignupPage() {
  const router = useRouter();
  const { signup, isLoading } = useAuth();
  const [formData, setFormData] = useState({
    name: "",
    representative: "",
    email: "",
    location: "",
    description: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signup({
        name: formData.name,
        email: formData.email,
        location: formData.location,
        role: "organization",
      });
      router.push("/organization");
    } catch (error) {
      console.error("Signup failed:", error);
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

          {/* Location */}
          <div>
            <label className="label-text block mb-1">
              Location
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, location: e.target.value }))
              }
              className="input-base"
              placeholder="City, District"
            />
          </div>

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
