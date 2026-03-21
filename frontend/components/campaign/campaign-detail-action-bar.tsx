"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Container from "@/components/common/container";
import { useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/api/http";
import {
  createVolunteerRegistration,
  listVolunteerRegistrations,
  quickJoinVolunteerRegistration,
} from "@/lib/api/volunteer-registrations";
import type { VolunteerRegistrationStatus } from "@/types/volunteer-registration";

interface CampaignDetailActionBarProps {
  campaignId: string;
  campaignSlug: string;
  campaignTitle: string;
  supportsMoney: boolean;
  supportsVolunteer: boolean;
}

function getJoinButtonLabel(
  status: VolunteerRegistrationStatus | null,
  isJoining: boolean
): string {
  if (isJoining) {
    return "Joining...";
  }
  if (status === "approved") {
    return "Joined as volunteer";
  }
  if (status === "pending") {
    return "Pending approval";
  }
  if (status === "rejected" || status === "cancelled") {
    return "Join again";
  }
  return "Join volunteer now";
}

export default function CampaignDetailActionBar({
  campaignId,
  campaignSlug,
  campaignTitle,
  supportsMoney,
  supportsVolunteer,
}: CampaignDetailActionBarProps) {
  const router = useRouter();
  const { currentUser, accessToken, isLoading } = useAuth();
  const [isJoining, setIsJoining] = useState(false);
  const [registrationStatus, setRegistrationStatus] =
    useState<VolunteerRegistrationStatus | null>(null);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  useEffect(() => {
    if (
      !supportsVolunteer ||
      !currentUser?.id ||
      !accessToken ||
      currentUser.role !== "supporter"
    ) {
      setRegistrationStatus(null);
      return;
    }

    let cancelled = false;
    const loadRegistration = async () => {
      try {
        const registrations = await listVolunteerRegistrations({
          campaignId,
          userId: currentUser.id,
          token: accessToken,
          limit: 50,
        });
        if (!cancelled) {
          setRegistrationStatus(registrations[0]?.status ?? null);
        }
      } catch {
        if (!cancelled) {
          setRegistrationStatus(null);
        }
      }
    };

    void loadRegistration();

    return () => {
      cancelled = true;
    };
  }, [accessToken, campaignId, currentUser?.id, currentUser?.role, supportsVolunteer]);

  if (!supportsMoney && !supportsVolunteer) {
    return null;
  }

  const isAlreadyJoined =
    registrationStatus === "pending" || registrationStatus === "approved";
  const joinButtonLabel = getJoinButtonLabel(registrationStatus, isJoining);

  const handleJoin = async () => {
    setFeedback(null);

    if (isLoading) {
      setFeedback({
        type: "error",
        message: "Your account is still loading. Please wait and try again.",
      });
      return;
    }

    if (!currentUser || !accessToken) {
      router.push(`/login?next=${encodeURIComponent(`/campaigns/${campaignSlug}`)}`);
      return;
    }

    if (currentUser.role !== "supporter") {
      setFeedback({
        type: "error",
        message: "Please use a supporter account to join this campaign.",
      });
      return;
    }

    setIsJoining(true);
    try {
      const registration = await quickJoinVolunteerRegistration(
        { campaignId },
        accessToken
      );
      setRegistrationStatus(registration.status);
      setFeedback({
        type: "success",
        message: `Joined "${campaignTitle}". You can review it in My joined campaigns.`,
      });
    } catch (error) {
      if (
        error instanceof ApiError &&
        (error.status === 404 || error.status === 405 || error.status === 422) &&
        currentUser.email
      ) {
        try {
          const fallbackRegistration = await createVolunteerRegistration(
            {
              campaignId,
              userId: currentUser.id,
              fullName: currentUser.name,
              email: currentUser.email,
            },
            accessToken
          );
          setRegistrationStatus(fallbackRegistration.status);
          setFeedback({
            type: "success",
            message: `Joined "${campaignTitle}".`,
          });
          return;
        } catch (fallbackError) {
          setFeedback({
            type: "error",
            message:
              fallbackError instanceof ApiError
                ? fallbackError.message
                : "Cannot join this volunteer campaign right now.",
          });
          return;
        }
      }

      setFeedback({
        type: "error",
        message:
          error instanceof ApiError
            ? error.message
            : "Cannot join this volunteer campaign right now.",
      });
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-white/95 backdrop-blur">
      <Container className="py-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
              Ready to support
            </p>
            <p className="truncate text-sm font-semibold text-heading md:text-base">
              {campaignTitle}
            </p>
            {feedback ? (
              <p
                className={`mt-1 text-xs ${
                  feedback.type === "success" ? "text-success" : "text-danger"
                }`}
              >
                {feedback.message}
              </p>
            ) : null}
          </div>

          <div className="flex w-full flex-wrap gap-2 lg:w-auto">
            {supportsMoney ? (
              <Link
                href={`/donate?campaignId=${campaignId}`}
                className="btn-base btn-primary flex-1 justify-center text-center lg:flex-none"
              >
                Donate money
              </Link>
            ) : null}

            {supportsVolunteer ? (
              <button
                type="button"
                onClick={() => {
                  void handleJoin();
                }}
                disabled={isJoining || isAlreadyJoined}
                className={`btn-base flex-1 justify-center text-center disabled:cursor-not-allowed disabled:opacity-60 lg:flex-none ${
                  isAlreadyJoined ? "btn-secondary" : "btn-primary"
                }`}
              >
                {joinButtonLabel}
              </button>
            ) : null}

            {supportsVolunteer && registrationStatus ? (
              <Link
                href="/supporter/registrations"
                className="btn-base btn-secondary flex-1 justify-center text-center lg:flex-none"
              >
                My joined campaigns
              </Link>
            ) : null}
          </div>
        </div>
      </Container>
    </div>
  );
}
