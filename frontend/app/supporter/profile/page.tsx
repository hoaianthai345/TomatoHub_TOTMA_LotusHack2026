"use client";

import { useAuth } from "@/lib/auth";
import RoleGate from "@/components/auth/RoleGate";
import { getSupportTypeLabel } from "@/lib/auth/supportTypes";

export default function SupporterProfilePage() {
  const { currentUser } = useAuth();

  return (
    <RoleGate role="supporter" loadingMessage="Loading supporter profile...">
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-6">Profile</h1>

        <div className="card-container p-6 max-w-2xl">
          <div className="space-y-4">
            <div>
              <label className="label-text block mb-1">
                Name
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

            <div>
              <label className="label-text block mb-1">
                Support Types
              </label>
              <div className="flex flex-wrap gap-2">
                {currentUser?.supportTypes && currentUser.supportTypes.length > 0 ? (
                  currentUser.supportTypes.map((type) => (
                    <span
                      key={type}
                      className="badge-base badge-supporter"
                    >
                      {getSupportTypeLabel(type)}
                    </span>
                  ))
                ) : (
                  <p className="text-muted">No support types selected</p>
                )}
              </div>
            </div>
          </div>

          <button
            className="mt-6 px-4 py-2 text-white rounded-lg transition font-medium"
            style={{
              backgroundColor: "var(--color-supporter)",
            }}
          >
            Edit Profile
          </button>
        </div>
      </div>
    </RoleGate>
  );
}
