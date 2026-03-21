"use client";

import { useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import type { Campaign, CampaignCoordinates } from "@/types/campaign";
import { getMapMarkerColors } from "@/lib/ui/tokens";
import { formatCurrency } from "@/utils/format";

interface CampaignLocationMapProps {
  campaigns: Campaign[];
  className?: string;
}

interface PinnedCampaign {
  campaign: Campaign;
  coordinates: CampaignCoordinates;
  isApproximate: boolean;
}

const VIETNAM_CENTER: CampaignCoordinates = {
  latitude: 16.047079,
  longitude: 108.20623,
};

const PROVINCE_FALLBACK_COORDINATES: Record<string, CampaignCoordinates> = {
  "an giang": { latitude: 10.521583, longitude: 105.125893 },
  "can tho": { latitude: 10.045162, longitude: 105.746857 },
  "dong thap": { latitude: 10.493798, longitude: 105.688179 },
  "ho chi minh city": { latitude: 10.776889, longitude: 106.700806 },
  "thanh pho ho chi minh": { latitude: 10.776889, longitude: 106.700806 },
  "tp ho chi minh": { latitude: 10.776889, longitude: 106.700806 },
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function supportTypesLabel(campaign: Campaign): string {
  if (!campaign.supportTypes?.length) {
    return "Open support";
  }

  return campaign.supportTypes.map((item) => item.toUpperCase()).join(" / ");
}

function normalizeProvince(value: string): string {
  return value.trim().toLowerCase();
}

function fallbackCoordinatesFromCampaign(
  campaign: Campaign
): CampaignCoordinates | null {
  if (campaign.province) {
    const byProvince = PROVINCE_FALLBACK_COORDINATES[normalizeProvince(campaign.province)];
    if (byProvince) {
      return byProvince;
    }
  }

  if (campaign.location) {
    const location = campaign.location.toLowerCase();
    const matchedProvince = Object.keys(PROVINCE_FALLBACK_COORDINATES).find(
      (provinceName) => location.includes(provinceName)
    );

    if (matchedProvince) {
      return PROVINCE_FALLBACK_COORDINATES[matchedProvince];
    }
  }

  return null;
}

export default function CampaignLocationMap({
  campaigns,
  className = "",
}: CampaignLocationMapProps) {
  const router = useRouter();
  const mapRef = useRef<HTMLDivElement | null>(null);
  const pinnedCampaigns = useMemo<PinnedCampaign[]>(
    () =>
      campaigns
        .map((campaign) => {
          if (campaign.coordinates) {
            return {
              campaign,
              coordinates: campaign.coordinates,
              isApproximate: false,
            };
          }

          const fallbackCoordinates = fallbackCoordinatesFromCampaign(campaign);
          if (!fallbackCoordinates) {
            return null;
          }

          return {
            campaign,
            coordinates: fallbackCoordinates,
            isApproximate: true,
          };
        })
        .filter((item): item is PinnedCampaign => item !== null),
    [campaigns]
  );

  useEffect(() => {
    if (!mapRef.current) {
      return;
    }

    let mapInstance: import("leaflet").Map | null = null;
    let disposed = false;

    const renderMap = async () => {
      const L = await import("leaflet");
      if (disposed || !mapRef.current) {
        return;
      }

      mapInstance = L.map(mapRef.current, { zoomControl: true });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(mapInstance);

      const bounds = L.latLngBounds([]);
      const markerColors = getMapMarkerColors();

      pinnedCampaigns.forEach((item) => {
        const marker = L.circleMarker(
          [item.coordinates.latitude, item.coordinates.longitude],
          {
            radius: 8,
            color: markerColors.campaignSecondaryStroke,
            fillColor: markerColors.campaignSecondaryFill,
            fillOpacity: 0.95,
            weight: 2,
          }
        ).addTo(mapInstance as import("leaflet").Map);

        marker.bindPopup(
          `<strong>${escapeHtml(item.campaign.title)}</strong><br/>` +
            `${escapeHtml(item.campaign.location || "Location pending")}<br/>` +
            `${escapeHtml(supportTypesLabel(item.campaign))}<br/>` +
            `Raised: ${escapeHtml(
              formatCurrency(item.campaign.raisedAmount)
            )} / ${escapeHtml(
              formatCurrency(item.campaign.goalAmount ?? item.campaign.targetAmount)
            )}<br/>` +
            `${item.isApproximate ? "Coordinates: Approximate by province." : "Coordinates: Exact campaign point."}`
        );
        marker.on("click", () => {
          router.push(`/campaigns/${item.campaign.slug}`);
        });

        bounds.extend([item.coordinates.latitude, item.coordinates.longitude]);
      });

      if (bounds.isValid()) {
        mapInstance.fitBounds(bounds.pad(0.2));
        return;
      }

      mapInstance.setView([VIETNAM_CENTER.latitude, VIETNAM_CENTER.longitude], 6);
    };

    renderMap();

    return () => {
      disposed = true;
      if (mapInstance) {
        mapInstance.remove();
      }
    };
  }, [pinnedCampaigns, router]);

  return (
    <section className={`relative z-0 card-base p-5 md:p-6 ${className}`.trim()}>
      <div>
        <div>
          <h2 className="text-xl font-bold text-heading">Campaign Location Map</h2>
          <p className="mt-1 text-sm text-text-muted">
            2D map (Leaflet + OpenStreetMap). Click a marker to open campaign details.
          </p>
        </div>
      </div>

      <div className="mt-5">
        <div className="overflow-hidden rounded-xl border border-border bg-surface-muted">
          <div ref={mapRef} className="nearby-map h-[480px] w-full md:h-[520px]" />
        </div>
      </div>
    </section>
  );
}
