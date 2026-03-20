"use client";

import { useAuth } from "@/lib/auth";

export default function SupporterDashboard() {
  const { currentUser } = useAuth();

  const statCards = [
    { label: "Active Campaigns", value: 0, color: "--color-primary" },
    { label: "Total Contributions", value: 0, color: "--color-info" },
    { label: "Tasks Completed", value: 0, color: "--color-success" },
    {
      label: "Support Types",
      value: currentUser?.supportTypes?.length || 0,
      color: "--color-supporter",
    },
  ];

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-1">Welcome, {currentUser?.name}!</h1>
      <p className="text-body mb-6">Your supporter dashboard</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Stats Cards */}
        {statCards.map((stat, idx) => (
          <div
            key={idx}
            className="p-6 rounded-lg border card-hover"
            style={{
              backgroundColor: `color-mix(in oklab, var(${stat.color}) 8%, white)`,
              borderColor: `var(${stat.color})`,
            }}
          >
            <h3 className="text-body text-sm font-medium mb-2">{stat.label}</h3>
            <p
              className="text-3xl font-bold"
              style={{ color: `var(${stat.color})` }}
            >
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-bold mb-4">Recent Activity</h2>
        <div className="card-container p-6 text-center text-muted">
          <p>No activity yet. Start by registering support for a campaign!</p>
        </div>
      </div>
    </div>
  );
}
