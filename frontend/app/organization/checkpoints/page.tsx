"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import RoleGate from "@/components/auth/RoleGate";
import { useAuth } from "@/lib/auth";
import { listCampaignsByOrganization } from "@/lib/api/campaigns";
import {
  createCampaignCheckpoint,
  deleteCampaignCheckpoint,
  generateCheckpointQrCode,
  listCampaignCheckpoints,
  listCheckpointScanLogs,
  listGoodsCheckinsForOrganization,
  updateCampaignCheckpoint,
} from "@/lib/api/campaign-checkpoints";
import { ApiError } from "@/lib/api/http";
import type { Campaign } from "@/types/campaign";
import type {
  CampaignCheckpoint,
  CampaignCheckpointQrCode,
  CheckpointScanLog,
  CheckpointScanType,
  CheckpointType,
  GoodsCheckin,
} from "@/types/checkpoint";
import { formatDateTime } from "@/utils/format";

interface CreateCheckpointFormState {
  name: string;
  checkpointType: CheckpointType;
  description: string;
  addressLine: string;
  isActive: boolean;
}

const CHECKPOINT_TYPE_LABEL: Record<CheckpointType, string> = {
  volunteer: "Volunteer",
  goods: "Goods",
};

function checkpointStatusClass(isActive: boolean): string {
  return isActive
    ? "rounded-full border border-success/30 bg-success/10 px-2 py-1 text-xs font-semibold text-success"
    : "rounded-full border border-border bg-surface-muted px-2 py-1 text-xs font-semibold text-text-muted";
}

function scanResultClass(result: CheckpointScanLog["result"]): string {
  if (result === "success") {
    return "text-success";
  }
  return "text-danger";
}

export default function OrganizationCheckpointsPage() {
  const { currentUser, accessToken, isLoading } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("");

  const [checkpoints, setCheckpoints] = useState<CampaignCheckpoint[]>([]);
  const [goodsCheckins, setGoodsCheckins] = useState<GoodsCheckin[]>([]);
  const [scanLogs, setScanLogs] = useState<CheckpointScanLog[]>([]);
  const [selectedCheckpointLogId, setSelectedCheckpointLogId] = useState<string | null>(
    null
  );
  const [qrData, setQrData] = useState<{
    checkpointId: string;
    checkpointName: string;
    data: CampaignCheckpointQrCode;
  } | null>(null);

  const [createForm, setCreateForm] = useState<CreateCheckpointFormState>({
    name: "",
    checkpointType: "volunteer",
    description: "",
    addressLine: "",
    isActive: true,
  });

  const [loadingCampaignData, setLoadingCampaignData] = useState(false);
  const [submittingCreate, setSubmittingCreate] = useState(false);
  const [actingCheckpointId, setActingCheckpointId] = useState<string | null>(null);
  const [loadingLogCheckpointId, setLoadingLogCheckpointId] = useState<string | null>(
    null
  );

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const organizationId = currentUser?.organizationId;
    if (isLoading || currentUser?.role !== "organization" || !organizationId) {
      return;
    }

    let cancelled = false;

    const loadCampaigns = async () => {
      try {
        const campaignList = await listCampaignsByOrganization(organizationId, {
          limit: 200,
          token: accessToken ?? undefined,
        });

        if (!cancelled) {
          setCampaigns(campaignList);
          setSelectedCampaignId((previous) => {
            if (previous && campaignList.some((item) => item.id === previous)) {
              return previous;
            }
            return campaignList[0]?.id ?? "";
          });
          setErrorMessage(null);
        }
      } catch (error) {
        if (!cancelled) {
          setCampaigns([]);
          setSelectedCampaignId("");
          setErrorMessage(
            error instanceof ApiError
              ? error.message
              : "Failed to load organization campaigns."
          );
        }
      }
    };

    void loadCampaigns();

    return () => {
      cancelled = true;
    };
  }, [accessToken, currentUser?.organizationId, currentUser?.role, isLoading]);

  useEffect(() => {
    if (!selectedCampaignId || !accessToken || currentUser?.role !== "organization") {
      setCheckpoints([]);
      setGoodsCheckins([]);
      setScanLogs([]);
      setSelectedCheckpointLogId(null);
      setQrData(null);
      return;
    }

    let cancelled = false;

    const loadCampaignData = async () => {
      setLoadingCampaignData(true);
      try {
        const [checkpointList, goodsList] = await Promise.all([
          listCampaignCheckpoints(selectedCampaignId, {
            includeInactive: true,
            limit: 300,
            token: accessToken,
          }),
          listGoodsCheckinsForOrganization({
            campaignId: selectedCampaignId,
            limit: 300,
            token: accessToken,
          }),
        ]);

        if (!cancelled) {
          setCheckpoints(checkpointList);
          setGoodsCheckins(goodsList);
          setErrorMessage(null);

          if (
            selectedCheckpointLogId &&
            !checkpointList.some((item) => item.id === selectedCheckpointLogId)
          ) {
            setSelectedCheckpointLogId(null);
            setScanLogs([]);
          }
        }
      } catch (error) {
        if (!cancelled) {
          setCheckpoints([]);
          setGoodsCheckins([]);
          setErrorMessage(
            error instanceof ApiError
              ? error.message
              : "Failed to load checkpoint and goods data."
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingCampaignData(false);
        }
      }
    };

    void loadCampaignData();

    return () => {
      cancelled = true;
    };
  }, [accessToken, currentUser?.role, selectedCampaignId, selectedCheckpointLogId]);

  const checkpointNameById = useMemo(() => {
    const map = new Map<string, string>();
    checkpoints.forEach((checkpoint) => {
      map.set(checkpoint.id, checkpoint.name);
    });
    return map;
  }, [checkpoints]);

  const campaignStats = useMemo(() => {
    const activeCheckpointCount = checkpoints.filter((item) => item.isActive).length;
    const volunteerCheckpointCount = checkpoints.filter(
      (item) => item.checkpointType === "volunteer"
    ).length;
    const goodsCheckpointCount = checkpoints.filter(
      (item) => item.checkpointType === "goods"
    ).length;

    return {
      activeCheckpointCount,
      volunteerCheckpointCount,
      goodsCheckpointCount,
    };
  }, [checkpoints]);

  const handleCreateCheckpoint = async () => {
    if (!accessToken) {
      setErrorMessage("Authentication token is missing.");
      return;
    }
    if (!selectedCampaignId) {
      setErrorMessage("Please select a campaign first.");
      return;
    }
    if (!createForm.name.trim()) {
      setErrorMessage("Checkpoint name is required.");
      return;
    }

    setSubmittingCreate(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await createCampaignCheckpoint(
        {
          campaignId: selectedCampaignId,
          name: createForm.name.trim(),
          checkpointType: createForm.checkpointType,
          description: createForm.description.trim() || undefined,
          addressLine: createForm.addressLine.trim() || undefined,
          isActive: createForm.isActive,
        },
        accessToken
      );

      const refreshed = await listCampaignCheckpoints(selectedCampaignId, {
        includeInactive: true,
        limit: 300,
        token: accessToken,
      });
      setCheckpoints(refreshed);

      setCreateForm({
        name: "",
        checkpointType: createForm.checkpointType,
        description: "",
        addressLine: "",
        isActive: true,
      });
      setSuccessMessage("Checkpoint created successfully.");
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError ? error.message : "Failed to create checkpoint."
      );
    } finally {
      setSubmittingCreate(false);
    }
  };

  const handleToggleActive = async (checkpoint: CampaignCheckpoint) => {
    if (!accessToken) {
      setErrorMessage("Authentication token is missing.");
      return;
    }

    setActingCheckpointId(checkpoint.id);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const updated = await updateCampaignCheckpoint(
        checkpoint.id,
        { isActive: !checkpoint.isActive },
        accessToken
      );

      setCheckpoints((previous) =>
        previous.map((item) => (item.id === checkpoint.id ? updated : item))
      );
      setSuccessMessage(
        `Checkpoint "${checkpoint.name}" is now ${updated.isActive ? "active" : "inactive"}.`
      );
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError
          ? error.message
          : "Failed to update checkpoint status."
      );
    } finally {
      setActingCheckpointId(null);
    }
  };

  const handleDeleteCheckpoint = async (checkpoint: CampaignCheckpoint) => {
    if (!accessToken) {
      setErrorMessage("Authentication token is missing.");
      return;
    }

    const confirmed = window.confirm(
      `Delete checkpoint "${checkpoint.name}"? This action cannot be undone.`
    );
    if (!confirmed) {
      return;
    }

    setActingCheckpointId(checkpoint.id);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await deleteCampaignCheckpoint(checkpoint.id, accessToken);
      setCheckpoints((previous) => previous.filter((item) => item.id !== checkpoint.id));
      setSuccessMessage(`Checkpoint "${checkpoint.name}" deleted.`);

      if (selectedCheckpointLogId === checkpoint.id) {
        setSelectedCheckpointLogId(null);
        setScanLogs([]);
      }
      if (qrData?.checkpointId === checkpoint.id) {
        setQrData(null);
      }
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError ? error.message : "Failed to delete checkpoint."
      );
    } finally {
      setActingCheckpointId(null);
    }
  };

  const handleGenerateQr = async (
    checkpoint: CampaignCheckpoint,
    scanType: CheckpointScanType
  ) => {
    if (!accessToken) {
      setErrorMessage("Authentication token is missing.");
      return;
    }

    setActingCheckpointId(checkpoint.id);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const qr = await generateCheckpointQrCode(
        checkpoint.id,
        {
          scanType,
          expiresInMinutes: 60,
        },
        accessToken
      );

      setQrData({
        checkpointId: checkpoint.id,
        checkpointName: checkpoint.name,
        data: qr,
      });
      setSuccessMessage(
        `QR generated for ${checkpoint.name} (${scanType.replace("_", " ")}).`
      );
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError ? error.message : "Failed to generate QR token."
      );
    } finally {
      setActingCheckpointId(null);
    }
  };

  const handleLoadLogs = async (checkpointId: string) => {
    if (!accessToken) {
      setErrorMessage("Authentication token is missing.");
      return;
    }

    setLoadingLogCheckpointId(checkpointId);
    setErrorMessage(null);

    try {
      const logs = await listCheckpointScanLogs(checkpointId, accessToken, 200);
      setSelectedCheckpointLogId(checkpointId);
      setScanLogs(logs);
      setSuccessMessage("Scan logs loaded.");
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError ? error.message : "Failed to load scan logs."
      );
    } finally {
      setLoadingLogCheckpointId(null);
    }
  };

  const handleCopyQrToken = async () => {
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

  return (
    <RoleGate role="organization" loadingMessage="Loading checkpoint workspace...">
      <div className="space-y-6 p-6">
        <section className="card-base p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-heading">Checkpoint Management</h1>
              <p className="mt-2 text-sm text-text-muted">
                Create checkpoint points, generate QR token for scan, and track goods
                check-ins from one workspace.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link href="/organization/campaigns" className="btn-base btn-secondary text-sm">
                Back to campaigns
              </Link>
              <Link
                href="/organization/campaigns/create"
                className="btn-base btn-primary text-sm"
              >
                Create campaign
              </Link>
            </div>
          </div>
        </section>

        {errorMessage ? (
          <p className="rounded-lg border border-danger/20 bg-danger/5 p-3 text-sm text-danger">
            {errorMessage}
          </p>
        ) : null}
        {successMessage ? (
          <p className="rounded-lg border border-success/20 bg-success/5 p-3 text-sm text-success">
            {successMessage}
          </p>
        ) : null}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="card-base p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
              Campaigns
            </p>
            <p className="mt-2 text-2xl font-bold text-heading">{campaigns.length}</p>
          </div>
          <div className="card-base p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
              Active checkpoints
            </p>
            <p className="mt-2 text-2xl font-bold text-success">
              {campaignStats.activeCheckpointCount}
            </p>
          </div>
          <div className="card-base p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
              Volunteer checkpoints
            </p>
            <p className="mt-2 text-2xl font-bold text-heading">
              {campaignStats.volunteerCheckpointCount}
            </p>
          </div>
          <div className="card-base p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
              Goods check-ins
            </p>
            <p className="mt-2 text-2xl font-bold text-heading">{goodsCheckins.length}</p>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_400px]">
          <div className="card-base p-6">
            <h2 className="text-lg font-semibold text-heading">Campaign & checkpoints</h2>

            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              <label className="block text-sm text-text">
                <span className="mb-2 block font-medium text-heading">Campaign</span>
                <select
                  className="input-base"
                  value={selectedCampaignId}
                  onChange={(event) => {
                    setSelectedCampaignId(event.target.value);
                    setSelectedCheckpointLogId(null);
                    setScanLogs([]);
                    setQrData(null);
                  }}
                >
                  {campaigns.length === 0 ? (
                    <option value="">No campaign available</option>
                  ) : null}
                  {campaigns.map((campaign) => (
                    <option key={campaign.id} value={campaign.id}>
                      {campaign.title} ({campaign.status})
                    </option>
                  ))}
                </select>
              </label>

              <div className="rounded-xl border border-border bg-surface-light p-3 text-sm">
                <p className="font-medium text-heading">Selected campaign</p>
                <p className="mt-1 text-text-muted">
                  {campaigns.find((item) => item.id === selectedCampaignId)?.title ??
                    "No campaign selected."}
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-border bg-surface-light p-4">
              <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-text-muted">
                Existing checkpoints
              </h3>

              {loadingCampaignData ? (
                <p className="mt-3 text-sm text-text-muted">Loading campaign data...</p>
              ) : checkpoints.length > 0 ? (
                <div className="mt-3 space-y-3">
                  {checkpoints.map((checkpoint) => (
                    <article key={checkpoint.id} className="rounded-xl border border-border bg-white p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="font-semibold text-heading">{checkpoint.name}</p>
                          <p className="text-xs uppercase tracking-[0.14em] text-text-muted">
                            {CHECKPOINT_TYPE_LABEL[checkpoint.checkpointType]} checkpoint
                          </p>
                        </div>
                        <span className={checkpointStatusClass(checkpoint.isActive)}>
                          {checkpoint.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>

                      <p className="mt-2 text-sm text-text-muted">
                        {checkpoint.description || "No description."}
                      </p>
                      <p className="mt-1 text-xs text-text-muted">
                        Address: {checkpoint.addressLine || "Not specified"} • Updated{" "}
                        {formatDateTime(checkpoint.updatedAt)}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="btn-base btn-secondary text-xs"
                          disabled={actingCheckpointId === checkpoint.id}
                          onClick={() => {
                            void handleToggleActive(checkpoint);
                          }}
                        >
                          {checkpoint.isActive ? "Set inactive" : "Set active"}
                        </button>

                        {checkpoint.checkpointType === "volunteer" ? (
                          <>
                            <button
                              type="button"
                              className="btn-base btn-primary text-xs"
                              disabled={actingCheckpointId === checkpoint.id}
                              onClick={() => {
                                void handleGenerateQr(checkpoint, "check_in");
                              }}
                            >
                              Check-in QR
                            </button>
                            <button
                              type="button"
                              className="btn-base btn-secondary text-xs"
                              disabled={actingCheckpointId === checkpoint.id}
                              onClick={() => {
                                void handleGenerateQr(checkpoint, "check_out");
                              }}
                            >
                              Check-out QR
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            className="btn-base btn-primary text-xs"
                            disabled={actingCheckpointId === checkpoint.id}
                            onClick={() => {
                              void handleGenerateQr(checkpoint, "check_in");
                            }}
                          >
                            Goods QR
                          </button>
                        )}

                        <button
                          type="button"
                          className="btn-base btn-secondary text-xs"
                          disabled={loadingLogCheckpointId === checkpoint.id}
                          onClick={() => {
                            void handleLoadLogs(checkpoint.id);
                          }}
                        >
                          {loadingLogCheckpointId === checkpoint.id ? "Loading logs..." : "View logs"}
                        </button>

                        <button
                          type="button"
                          className="btn-base rounded-lg bg-danger text-xs text-white"
                          disabled={actingCheckpointId === checkpoint.id}
                          onClick={() => {
                            void handleDeleteCheckpoint(checkpoint);
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-text-muted">
                  No checkpoints for this campaign yet.
                </p>
              )}
            </div>
          </div>

          <aside className="space-y-6">
            <div className="card-base p-6">
              <h2 className="text-lg font-semibold text-heading">Create checkpoint</h2>
              <div className="mt-4 space-y-3">
                <label className="block text-sm text-text">
                  <span className="mb-1 block font-medium text-heading">Name</span>
                  <input
                    className="input-base"
                    value={createForm.name}
                    onChange={(event) =>
                      setCreateForm((previous) => ({
                        ...previous,
                        name: event.target.value,
                      }))
                    }
                    placeholder="Ex: Gate A / Warehouse"
                  />
                </label>

                <label className="block text-sm text-text">
                  <span className="mb-1 block font-medium text-heading">Type</span>
                  <select
                    className="input-base"
                    value={createForm.checkpointType}
                    onChange={(event) =>
                      setCreateForm((previous) => ({
                        ...previous,
                        checkpointType: event.target.value as CheckpointType,
                      }))
                    }
                  >
                    <option value="volunteer">Volunteer</option>
                    <option value="goods">Goods</option>
                  </select>
                </label>

                <label className="block text-sm text-text">
                  <span className="mb-1 block font-medium text-heading">Address</span>
                  <input
                    className="input-base"
                    value={createForm.addressLine}
                    onChange={(event) =>
                      setCreateForm((previous) => ({
                        ...previous,
                        addressLine: event.target.value,
                      }))
                    }
                    placeholder="Checkpoint address"
                  />
                </label>

                <label className="block text-sm text-text">
                  <span className="mb-1 block font-medium text-heading">Description</span>
                  <textarea
                    className="input-base min-h-24"
                    value={createForm.description}
                    onChange={(event) =>
                      setCreateForm((previous) => ({
                        ...previous,
                        description: event.target.value,
                      }))
                    }
                    placeholder="What happens at this checkpoint?"
                  />
                </label>

                <label className="flex items-center gap-2 text-sm text-text">
                  <input
                    type="checkbox"
                    checked={createForm.isActive}
                    onChange={(event) =>
                      setCreateForm((previous) => ({
                        ...previous,
                        isActive: event.target.checked,
                      }))
                    }
                  />
                  Set active immediately
                </label>

                <button
                  type="button"
                  className="btn-base btn-primary w-full"
                  disabled={submittingCreate || !selectedCampaignId}
                  onClick={() => {
                    void handleCreateCheckpoint();
                  }}
                >
                  {submittingCreate ? "Creating..." : "Create checkpoint"}
                </button>
              </div>
            </div>

            <div className="card-base p-6">
              <h2 className="text-lg font-semibold text-heading">Latest QR token</h2>
              {qrData ? (
                <div className="mt-4 space-y-3 text-sm">
                  <p>
                    <span className="font-medium text-heading">Checkpoint:</span>{" "}
                    {qrData.checkpointName}
                  </p>
                  <p>
                    <span className="font-medium text-heading">Scan type:</span>{" "}
                    {qrData.data.scanType}
                  </p>
                  <p>
                    <span className="font-medium text-heading">Expires at:</span>{" "}
                    {formatDateTime(qrData.data.expiresAt)}
                  </p>
                  <textarea
                    className="input-base min-h-28 text-xs"
                    value={qrData.data.token}
                    readOnly
                  />
                  <button
                    type="button"
                    className="btn-base btn-secondary w-full"
                    onClick={() => {
                      void handleCopyQrToken();
                    }}
                  >
                    Copy token
                  </button>
                </div>
              ) : (
                <p className="mt-3 text-sm text-text-muted">
                  Generate a checkpoint QR to display token and expiry here.
                </p>
              )}
            </div>
          </aside>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <div className="card-base p-6">
            <h2 className="text-lg font-semibold text-heading">Goods check-ins</h2>
            <p className="mt-1 text-sm text-text-muted">
              Latest goods check-ins for selected campaign.
            </p>

            {goodsCheckins.length > 0 ? (
              <div className="mt-4 overflow-x-auto rounded-xl border border-border">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="bg-surface-muted text-text-muted">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Time</th>
                      <th className="px-4 py-3 font-semibold">Item</th>
                      <th className="px-4 py-3 font-semibold">Quantity</th>
                      <th className="px-4 py-3 font-semibold">Donor</th>
                      <th className="px-4 py-3 font-semibold">Checkpoint</th>
                      <th className="px-4 py-3 font-semibold">Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {goodsCheckins.map((item) => (
                      <tr key={item.id} className="border-t border-border">
                        <td className="px-4 py-3">{formatDateTime(item.checkedInAt)}</td>
                        <td className="px-4 py-3">{item.itemName}</td>
                        <td className="px-4 py-3">
                          {item.quantity} {item.unit}
                        </td>
                        <td className="px-4 py-3">{item.donorName}</td>
                        <td className="px-4 py-3 text-text-muted">
                          {checkpointNameById.get(item.checkpointId) ?? item.checkpointId}
                        </td>
                        <td className="px-4 py-3 text-text-muted">{item.note ?? "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="mt-3 text-sm text-text-muted">
                No goods check-ins yet for this campaign.
              </p>
            )}
          </div>

          <div className="card-base p-6">
            <h2 className="text-lg font-semibold text-heading">Checkpoint scan logs</h2>
            <p className="mt-1 text-sm text-text-muted">
              {selectedCheckpointLogId
                ? `Showing logs for ${checkpointNameById.get(selectedCheckpointLogId) ?? selectedCheckpointLogId}.`
                : "Choose a checkpoint and click View logs to inspect scan activity."}
            </p>

            {scanLogs.length > 0 ? (
              <div className="mt-4 overflow-x-auto rounded-xl border border-border">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="bg-surface-muted text-text-muted">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Scanned at</th>
                      <th className="px-4 py-3 font-semibold">Type</th>
                      <th className="px-4 py-3 font-semibold">Result</th>
                      <th className="px-4 py-3 font-semibold">User</th>
                      <th className="px-4 py-3 font-semibold">Message</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scanLogs.map((log) => (
                      <tr key={log.id} className="border-t border-border">
                        <td className="px-4 py-3">{formatDateTime(log.scannedAt)}</td>
                        <td className="px-4 py-3">{log.scanType}</td>
                        <td className={`px-4 py-3 font-semibold ${scanResultClass(log.result)}`}>
                          {log.result}
                        </td>
                        <td className="px-4 py-3 text-text-muted">{log.userId ?? "-"}</td>
                        <td className="px-4 py-3 text-text-muted">{log.message ?? "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="mt-3 text-sm text-text-muted">No logs loaded.</p>
            )}
          </div>
        </section>
      </div>
    </RoleGate>
  );
}

