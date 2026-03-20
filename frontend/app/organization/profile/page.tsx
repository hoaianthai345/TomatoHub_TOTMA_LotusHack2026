"use client";

import { useAuth } from "@/lib/auth";
import RoleGate from "@/components/auth/RoleGate";

export default function OrganizationProfilePage() {
  const { currentUser } = useAuth();

  return (
    <RoleGate role="organization" loadingMessage="Loading organization profile...">
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-6">Organization Profile</h1>

        <div className="card-container p-6 max-w-2xl">
          <div className="space-y-4">
            <div>
              <label className="label-text block mb-1">
                Organization Name
              </label>
              <p className="text-lg text-heading">
                {currentUser?.organizationName || currentUser?.name}
              </p>
            </div>

            <div>
              <label className="label-text block mb-1">
                Representative Name
              </label>
              <p className="text-lg text-heading">{currentUser?.name}</p>
            </div>

            <div>
              <label className="label-text block mb-1">
                Email
              </label>
              <p className="text-lg text-heading">
                {currentUser?.email || "Not provided"}
              </p>
            </div>

            <div>
              <label className="label-text block mb-1">
                Location
              </label>
              <p className="text-lg text-heading">
                {currentUser?.location || "Not provided"}
              </p>
            </div>
          </div>

          <button
            className="mt-6 px-4 py-2 text-white rounded-lg transition font-medium"
            style={{
              backgroundColor: "var(--color-org)",
            }}
          >
            Edit Organization
          </button>
        </div>
      </div>
    </RoleGate>
  );
}
