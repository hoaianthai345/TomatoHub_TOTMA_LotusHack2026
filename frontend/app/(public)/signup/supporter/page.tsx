"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthApiError } from "@/lib/auth/api";
import { useAuth } from "@/lib/auth";
import type { SupportType } from "@/lib/auth";

export default function SupporterSignupPage() {
  const router = useRouter();
  const { signupSupporter, isLoading } = useAuth();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    location: "",
    supportTypes: [] as SupportType[],
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const supportTypeOptions: { value: SupportType; label: string }[] = [
    { value: "donor_money", label: "Donate Money" },
    { value: "donor_goods", label: "Donate Goods" },
    { value: "volunteer", label: "Volunteer" },
    { value: "shipper", label: "Shipper" },
    { value: "coordinator", label: "Coordinator" },
  ];

  const handleSupportTypeChange = (type: SupportType) => {
    setFormData((prev) => ({
      ...prev,
      supportTypes: prev.supportTypes.includes(type)
        ? prev.supportTypes.filter((t) => t !== type)
        : [...prev.supportTypes, type],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    try {
      await signupSupporter({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        location: formData.location,
        supportTypes: formData.supportTypes.length ? formData.supportTypes : undefined,
      });
      router.push("/supporter");
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
          Join as Supporter
        </h1>
        <p className="text-body mb-6">
          Create your supporter profile and start helping campaigns
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="label-text block mb-1">
              Full Name
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
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
              placeholder="your@email.com"
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
              value={formData.password}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, password: e.target.value }))
              }
              className="input-base"
              placeholder="At least 8 characters"
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

          {/* Support Types */}
          <div>
            <label className="label-text block mb-2">
              How do you want to support? (Optional)
            </label>
            <div className="space-y-2">
              {supportTypeOptions.map((option) => (
                <label key={option.value} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.supportTypes.includes(option.value)}
                    onChange={() => handleSupportTypeChange(option.value)}
                    className="w-4 h-4 rounded"
                    style={{ accentColor: 'var(--color-supporter)' }}
                  />
                  <span className="ml-2 text-body">{option.label}</span>
                </label>
              ))}
            </div>
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
            className="btn-base w-full bg-supporter text-white disabled:opacity-50 mt-6 justify-center"
          >
            {isLoading ? "Creating account..." : "Create Account"}
          </button>
        </form>
      </div>
    </div>
  );
}
