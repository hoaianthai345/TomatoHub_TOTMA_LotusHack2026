"use client";

import { FormEvent, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import RoleGate from "@/components/auth/RoleGate";
import MissingValue from "@/components/common/missing-value";
import StatePanel from "@/components/common/state-panel";
import { ApiError } from "@/lib/api/http";
import {
  listMyGoodsCheckins,
  listMyAttendance,
  scanCampaignCheckpoint,
} from "@/lib/api/campaign-checkpoints";
import type {
  CampaignCheckpointScanResponse,
  GoodsCheckin,
  VolunteerAttendance,
} from "@/types/checkpoint";
import { formatDateTime } from "@/utils/format";

export default function SupporterScanQrPage() {
  const { currentUser, accessToken, isLoading } = useAuth();
  const [tokenValue, setTokenValue] = useState("");
  const [donorName, setDonorName] = useState("");
  const [itemName, setItemName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("item");
  const [note, setNote] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<CampaignCheckpointScanResponse | null>(null);
  const [attendanceHistory, setAttendanceHistory] = useState<VolunteerAttendance[]>(
    []
  );
  const [goodsHistory, setGoodsHistory] = useState<GoodsCheckin[]>([]);
  const [historyTab, setHistoryTab] = useState<"attendance" | "goods">("attendance");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenFromUrl = params.get("token");
    if (tokenFromUrl) {
      setTokenValue(tokenFromUrl);
    }
  }, []);

  useEffect(() => {
    if (
      isLoading ||
      currentUser?.role !== "supporter" ||
      !currentUser.id ||
      !accessToken
    ) {
      return;
    }

    let cancelled = false;

    const loadHistory = async () => {
      try {
        const [attendances, goodsCheckins] = await Promise.all([
          listMyAttendance(accessToken),
          listMyGoodsCheckins(accessToken),
        ]);
        if (!cancelled) {
          setAttendanceHistory(attendances);
          setGoodsHistory(goodsCheckins);
        }
      } catch {
        if (!cancelled) {
          setAttendanceHistory([]);
          setGoodsHistory([]);
        }
      }
    };

    loadHistory();

    return () => {
      cancelled = true;
    };
  }, [accessToken, currentUser?.id, currentUser?.role, isLoading]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setResult(null);

    if (!accessToken) {
      setErrorMessage("Authentication token is missing.");
      return;
    }
    if (!tokenValue.trim()) {
      setErrorMessage("Please paste QR token.");
      return;
    }

    const parsedQuantity = quantity.trim() ? Number(quantity) : undefined;

    setSubmitting(true);
    try {
      const response = await scanCampaignCheckpoint(
        {
          token: tokenValue.trim(),
          donorName: donorName.trim() || undefined,
          itemName: itemName.trim() || undefined,
          quantity:
            parsedQuantity !== undefined && Number.isFinite(parsedQuantity)
              ? parsedQuantity
              : undefined,
          unit: unit.trim() || undefined,
          note: note.trim() || undefined,
        },
        accessToken
      );
      setResult(response);
      setSuccessMessage(response.message);

      if (response.flowType === "volunteer") {
        const refreshedAttendance = await listMyAttendance(accessToken);
        setAttendanceHistory(refreshedAttendance);
        setHistoryTab("attendance");
      }

      if (response.flowType === "goods") {
        const refreshedGoods = await listMyGoodsCheckins(accessToken);
        setGoodsHistory(refreshedGoods);
        setHistoryTab("goods");
        setDonorName("");
        setItemName("");
        setQuantity("");
        setUnit("item");
        setNote("");
      }
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError ? error.message : "Failed to process QR scan."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <RoleGate role="supporter" loadingMessage="Loading QR scan page...">
      <div className="p-6">
        <h1 className="mb-2 text-3xl font-bold">Scan QR</h1>
        <p className="mb-6 text-body">
          Paste QR token to check-in/check-out volunteer sessions or record goods
          check-in.
        </p>

        {errorMessage ? (
          <StatePanel variant="error" className="mb-4" message={errorMessage} />
        ) : null}
        {successMessage ? (
          <StatePanel variant="success" className="mb-4" message={successMessage} />
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="card-base p-6">
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="mb-2 block text-sm font-medium text-text">
                  QR Token
                </label>
                <textarea
                  className="input-base min-h-28"
                  value={tokenValue}
                  onChange={(event) => setTokenValue(event.target.value)}
                  placeholder="Paste token from QR"
                  required
                />
              </div>

              <div className="rounded-lg border border-border bg-surface-muted/40 p-4">
                <p className="text-sm font-medium text-heading">
                  Optional fields for goods check-in
                </p>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <input
                    className="input-base"
                    placeholder="Donor name (optional)"
                    value={donorName}
                    onChange={(event) => setDonorName(event.target.value)}
                  />
                  <input
                    className="input-base"
                    placeholder="Item name"
                    value={itemName}
                    onChange={(event) => setItemName(event.target.value)}
                  />
                  <input
                    type="number"
                    min={0.01}
                    step={0.01}
                    className="input-base"
                    placeholder="Quantity"
                    value={quantity}
                    onChange={(event) => setQuantity(event.target.value)}
                  />
                  <input
                    className="input-base"
                    placeholder="Unit (box, kg, item...)"
                    value={unit}
                    onChange={(event) => setUnit(event.target.value)}
                  />
                  <input
                    className="input-base md:col-span-2"
                    placeholder="Note (optional)"
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                  />
                </div>
              </div>

              <button
                type="submit"
                className="btn-base btn-primary w-full"
                disabled={submitting}
              >
                {submitting ? "Processing..." : "Submit scan"}
              </button>
            </form>
          </div>

          <aside className="card-base p-6">
            <h2 className="text-lg font-semibold text-heading">Latest Result</h2>
            {result ? (
              <div className="mt-3 space-y-2 text-sm">
                <p>
                  Flow: <span className="font-semibold">{result.flowType}</span>
                </p>
                <p>
                  Type: <span className="font-semibold">{result.scanType}</span>
                </p>
                {result.attendance ? (
                  <p className="text-text-muted">
                    Attendance at {formatDateTime(result.attendance.checkInAt)}
                  </p>
                ) : null}
                {result.goodsCheckin ? (
                  <p className="text-text-muted">
                    Goods: {result.goodsCheckin.itemName} x{result.goodsCheckin.quantity}{" "}
                    {result.goodsCheckin.unit}
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="mt-2 text-sm text-text-muted">
                No scan result yet.
              </p>
            )}
          </aside>
        </div>

        <div className="mt-8 card-base p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-heading">My Check-in History</h2>
            <div className="flex gap-2">
              <button
                type="button"
                className={`btn-base text-sm ${
                  historyTab === "attendance" ? "btn-primary" : "btn-secondary"
                }`}
                onClick={() => setHistoryTab("attendance")}
              >
                Volunteer attendance
              </button>
              <button
                type="button"
                className={`btn-base text-sm ${
                  historyTab === "goods" ? "btn-primary" : "btn-secondary"
                }`}
                onClick={() => setHistoryTab("goods")}
              >
                Goods check-ins
              </button>
            </div>
          </div>

          {historyTab === "attendance" ? (
            attendanceHistory.length > 0 ? (
              <div className="mt-4 overflow-hidden rounded-xl border border-border">
                <table className="w-full text-left text-sm">
                  <thead className="bg-surface-muted text-text-muted">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Check-in</th>
                      <th className="px-4 py-3 font-semibold">Check-out</th>
                      <th className="px-4 py-3 font-semibold">Duration (min)</th>
                      <th className="px-4 py-3 font-semibold">Campaign</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceHistory.slice(0, 20).map((item) => (
                      <tr key={item.id} className="border-t border-border">
                        <td className="px-4 py-3">{formatDateTime(item.checkInAt)}</td>
                        <td className="px-4 py-3">
                          {item.checkOutAt ? (
                            formatDateTime(item.checkOutAt)
                          ) : (
                            <MissingValue text="N/A" />
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {item.durationMinutes ?? <MissingValue text="N/A" />}
                        </td>
                        <td className="px-4 py-3 text-text-muted">{item.campaignId}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="mt-3 text-sm text-text-muted">
                No attendance records yet.
              </p>
            )
          ) : goodsHistory.length > 0 ? (
            <div className="mt-4 overflow-hidden rounded-xl border border-border">
              <table className="w-full text-left text-sm">
                <thead className="bg-surface-muted text-text-muted">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Checked in at</th>
                    <th className="px-4 py-3 font-semibold">Item</th>
                    <th className="px-4 py-3 font-semibold">Quantity</th>
                    <th className="px-4 py-3 font-semibold">Donor</th>
                    <th className="px-4 py-3 font-semibold">Campaign</th>
                  </tr>
                </thead>
                <tbody>
                  {goodsHistory.slice(0, 20).map((item) => (
                    <tr key={item.id} className="border-t border-border">
                      <td className="px-4 py-3">{formatDateTime(item.checkedInAt)}</td>
                      <td className="px-4 py-3">{item.itemName}</td>
                      <td className="px-4 py-3">
                        {item.quantity} {item.unit}
                      </td>
                      <td className="px-4 py-3 text-text-muted">{item.donorName}</td>
                      <td className="px-4 py-3 text-text-muted">{item.campaignId}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mt-3 text-sm text-text-muted">
              No goods check-in records yet.
            </p>
          )}
        </div>
      </div>
    </RoleGate>
  );
}
