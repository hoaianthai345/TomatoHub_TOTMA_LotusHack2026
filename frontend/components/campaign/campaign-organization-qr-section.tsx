"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import QRCode from "qrcode";
import FormField from "@/components/common/form-field";
import StatePanel from "@/components/common/state-panel";
import { useAuth } from "@/lib/auth";
import {
  generateCheckpointQrCode,
  listCampaignCheckpoints,
} from "@/lib/api/campaign-checkpoints";
import { ApiError } from "@/lib/api/http";
import type {
  CampaignCheckpoint,
  CampaignCheckpointQrCode,
  CheckpointScanType,
} from "@/types/checkpoint";
import { formatDateTime } from "@/utils/format";

interface CampaignOrganizationQrSectionProps {
  campaignId: string;
  campaignOrganizationId: string;
}

const SCAN_TYPE_OPTIONS: Array<{
  value: CheckpointScanType;
  label: string;
  hint: string;
}> = [
  {
    value: "check_in",
    label: "Volunteer Check-in",
    hint: "Use when volunteers arrive at checkpoint.",
  },
  {
    value: "check_out",
    label: "Volunteer Check-out",
    hint: "Use when volunteers complete shift and leave.",
  },
];

function scanTypeButtonClass(isActive: boolean): string {
  if (isActive) {
    return "border border-org/35 bg-org/10 text-org";
  }
  return "border border-border bg-white text-text-muted hover:border-org/25 hover:text-org";
}

export default function CampaignOrganizationQrSection({
  campaignId,
  campaignOrganizationId,
}: CampaignOrganizationQrSectionProps) {
  const { currentUser, accessToken } = useAuth();
  const isOwnerOrg =
    currentUser?.role === "organization" &&
    currentUser.organizationId === campaignOrganizationId &&
    Boolean(accessToken);

  const [checkpoints, setCheckpoints] = useState<CampaignCheckpoint[]>([]);
  const [selectedCheckpointId, setSelectedCheckpointId] = useState("");
  const [scanType, setScanType] = useState<CheckpointScanType>("check_in");

  const [loading, setLoading] = useState(false);
  const [generatingQr, setGeneratingQr] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [qrData, setQrData] = useState<{
    checkpointName: string;
    data: CampaignCheckpointQrCode;
    imageDataUrl: string;
  } | null>(null);

  useEffect(() => {
    if (!isOwnerOrg || !accessToken) {
      setCheckpoints([]);
      setSelectedCheckpointId("");
      setQrData(null);
      return;
    }

    let cancelled = false;

    const loadCheckpoints = async () => {
      setLoading(true);
      try {
        const checkpointList = await listCampaignCheckpoints(campaignId, {
          includeInactive: true,
          limit: 300,
          token: accessToken,
        });
        const volunteerCheckpoints = checkpointList.filter(
          (item) => item.checkpointType === "volunteer"
        );

        if (!cancelled) {
          setCheckpoints(volunteerCheckpoints);
          setSelectedCheckpointId((previous) => {
            if (
              previous &&
              volunteerCheckpoints.some((item) => item.id === previous)
            ) {
              return previous;
            }

            return (
              volunteerCheckpoints.find((item) => item.isActive)?.id ??
              volunteerCheckpoints[0]?.id ??
              ""
            );
          });
          setErrorMessage(null);
        }
      } catch (error) {
        if (!cancelled) {
          setCheckpoints([]);
          setSelectedCheckpointId("");
          setErrorMessage(
            error instanceof ApiError
              ? error.message
              : "Failed to load volunteer checkpoints."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadCheckpoints();

    return () => {
      cancelled = true;
    };
  }, [accessToken, campaignId, isOwnerOrg]);

  const selectedCheckpoint = useMemo(
    () => checkpoints.find((item) => item.id === selectedCheckpointId) ?? null,
    [checkpoints, selectedCheckpointId]
  );

  const handleGenerateQr = async () => {
    if (!isOwnerOrg || !accessToken || !selectedCheckpoint) {
      return;
    }

    setGeneratingQr(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const generatedQr = await generateCheckpointQrCode(
        selectedCheckpoint.id,
        {
          scanType,
          expiresInMinutes: 60,
        },
        accessToken
      );
      const imageDataUrl = await QRCode.toDataURL(generatedQr.token, {
        width: 240,
        margin: 1,
      });

      setQrData({
        checkpointName: selectedCheckpoint.name,
        data: generatedQr,
        imageDataUrl,
      });
      setSuccessMessage(
        `QR generated for ${selectedCheckpoint.name} (${scanType.replace("_", " ")}).`
      );
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError ? error.message : "Failed to generate QR code."
      );
    } finally {
      setGeneratingQr(false);
    }
  };

  const handleCopyToken = async () => {
    if (!qrData?.data.token) {
      return;
    }

    try {
      await navigator.clipboard.writeText(qrData.data.token);
      setSuccessMessage("QR token copied to clipboard.");
    } catch {
      setErrorMessage("Unable to copy token automatically. Please copy manually.");
    }
  };

  if (!isOwnerOrg) {
    return null;
  }

  return (
    <section className="mt-8 card-base p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-heading">Organization QR Control</h2>
          <p className="mt-1 text-sm text-text-muted">
            Generate volunteer QR for check-in or check-out directly from this campaign.
          </p>
        </div>
        <span className="rounded-full border border-org/30 bg-org/10 px-3 py-1 text-xs font-semibold text-org">
          Organization QR
        </span>
      </div>

      {errorMessage ? (
        <StatePanel variant="error" className="mt-4" message={errorMessage} />
      ) : null}
      {successMessage ? (
        <StatePanel variant="success" className="mt-4" message={successMessage} />
      ) : null}

      {loading ? (
        <StatePanel
          variant="loading"
          className="mt-4"
          message="Loading volunteer checkpoints..."
        />
      ) : null}

      {!loading && checkpoints.length === 0 ? (
        <StatePanel
          variant="warning"
          className="mt-4"
          message="No volunteer checkpoint is available for this campaign yet."
          action={
            <Link
              href="/organization/checkpoints"
              className="text-sm font-semibold text-org underline underline-offset-2"
            >
              Open checkpoint workspace
            </Link>
          }
        />
      ) : null}

      {!loading && checkpoints.length > 0 ? (
        <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="space-y-4">
            <FormField
              label="Volunteer checkpoint"
              helper="Choose which volunteer checkpoint should issue this QR."
            >
              <select
                className="input-base"
                value={selectedCheckpointId}
                onChange={(event) => {
                  setSelectedCheckpointId(event.target.value);
                }}
              >
                {checkpoints.map((checkpoint) => (
                  <option key={checkpoint.id} value={checkpoint.id}>
                    {checkpoint.name}
                    {checkpoint.isActive ? "" : " (Inactive)"}
                  </option>
                ))}
              </select>
            </FormField>

            <div className="grid gap-2 sm:grid-cols-2">
              {SCAN_TYPE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`badge-base justify-center p-3 text-sm transition ${scanTypeButtonClass(
                    scanType === option.value
                  )}`}
                  onClick={() => {
                    setScanType(option.value);
                  }}
                >
                  <span>{option.label}</span>
                </button>
              ))}
            </div>

            <p className="text-xs text-text-muted">
              {SCAN_TYPE_OPTIONS.find((item) => item.value === scanType)?.hint}
            </p>

            {selectedCheckpoint && !selectedCheckpoint.isActive ? (
              <StatePanel
                variant="warning"
                message="This checkpoint is inactive. Generated QR may be rejected when scanned."
              />
            ) : null}

            <button
              type="button"
              onClick={() => {
                void handleGenerateQr();
              }}
              disabled={generatingQr || !selectedCheckpointId}
              className="btn-base bg-org text-white disabled:opacity-60"
            >
              {generatingQr ? "Generating..." : "Generate QR"}
            </button>
          </div>

          <aside className="rounded-2xl border border-border bg-surface-light p-4">
            <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-text-muted">
              Latest volunteer QR
            </h3>

            {qrData ? (
              <div className="mt-3 space-y-3 text-sm">
                <div className="mx-auto w-fit rounded-xl border border-border bg-white p-3">
                  <Image
                    src={qrData.imageDataUrl}
                    alt={`QR token for ${qrData.checkpointName}`}
                    width={240}
                    height={240}
                    unoptimized
                  />
                </div>
                <p className="text-text">
                  <span className="font-semibold text-heading">Checkpoint:</span>{" "}
                  {qrData.checkpointName}
                </p>
                <p className="text-text">
                  <span className="font-semibold text-heading">Scan type:</span>{" "}
                  {qrData.data.scanType.replace("_", " ")}
                </p>
                <p className="text-text">
                  <span className="font-semibold text-heading">Expires:</span>{" "}
                  {formatDateTime(qrData.data.expiresAt)}
                </p>
                <textarea
                  className="input-base min-h-24 text-xs"
                  readOnly
                  value={qrData.data.token}
                />
                <button
                  type="button"
                  className="btn-base btn-secondary w-full"
                  onClick={() => {
                    void handleCopyToken();
                  }}
                >
                  Copy token
                </button>
              </div>
            ) : (
              <StatePanel
                variant="info"
                className="mt-3"
                message="Choose checkpoint + scan type, then generate QR."
              />
            )}
          </aside>
        </div>
      ) : null}
    </section>
  );
}
