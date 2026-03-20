"use client";

import Link from "next/link";

export default function SignupPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-page p-4">
      <div className="card-base p-8 w-full max-w-md">
        <h1 className="text-3xl font-bold text-center mb-2 text-heading">
          Join TomatoHub
        </h1>
        <p className="text-center text-body mb-8">
          Choose how you want to use the platform
        </p>

        {/* Signup Option 1: Supporter */}
        <Link
          href="/signup/supporter"
          className="card-hover card-base block mb-4 p-6 border-2 border-border hover:border-supporter transition"
        >
          <h2 className="text-lg font-bold text-heading mb-2">
            Join as Supporter
          </h2>
          <p className="text-body text-sm">
            Help campaigns through money, goods, volunteering, shipping, or
            coordination.
          </p>
        </Link>

        {/* Signup Option 2: Organization */}
        <Link
          href="/signup/organization"
          className="card-hover card-base block p-6 border-2 border-border hover:border-org transition"
        >
          <h2 className="text-lg font-bold text-heading mb-2">
            Join as Organization
          </h2>
          <p className="text-body text-sm">
            Create campaigns, manage beneficiaries, coordinate support, and
            publish transparency.
          </p>
        </Link>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-main"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-page text-muted">Already have account?</span>
          </div>
        </div>

        <Link
          href="/login"
          className="btn-base w-full btn-secondary justify-center"
        >
          Sign in instead
        </Link>
      </div>
    </div>
  );
}
