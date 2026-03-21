"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Campaign, CampaignCoordinates } from "@/types/campaign";

interface NearbyCampaignMapProps {
  campaigns: Campaign[];
  className?: string;
  showHeader?: boolean;
  maxCampaigns?: number;
}

type LocationStatus =
  | "idle"
  | "locating"
  | "ready"
  | "unsupported"
  | "denied"
  | "error";

interface CampaignWithDistance {
  campaign: Campaign;
  distanceKm: number | null;
}

const FALLBACK_LOCATION: CampaignCoordinates = {
  latitude: 10.7769,
  longitude: 106.7009,
};

const NEARBY_RADIUS_KM = 25;
const DEFAULT_MAX_NEARBY_CAMPAIGNS = 6;

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function calculateDistanceKm(
  from: CampaignCoordinates,
  to: CampaignCoordinates
): number {
  const earthRadiusKm = 6371;
  const deltaLat = toRadians(to.latitude - from.latitude);
  const deltaLng = toRadians(to.longitude - from.longitude);

  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(toRadians(from.latitude)) *
      Math.cos(toRadians(to.latitude)) *
      Math.sin(deltaLng / 2) ** 2;

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getLocationMessage(status: LocationStatus): string {
  if (status === "ready") {
    return "Showing campaigns close to your current location.";
  }
  if (status === "locating") {
    return "Checking your location...";
  }
  if (status === "denied") {
    return "Location access is blocked. Using the default point in Ho Chi Minh City.";
  }
  if (status === "unsupported") {
    return "Your browser does not support geolocation. Using the default point in Ho Chi Minh City.";
  }
  if (status === "error") {
    return "We could not detect your location. Using the default point in Ho Chi Minh City.";
  }
  return "Allow location access to find campaigns closer to you.";
}

function formatDistance(distanceKm: number | null): string {
  if (distanceKm === null) {
    return "Unknown";
  }
  return `${distanceKm.toFixed(1)} km`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export default function NearbyCampaignMap({
  campaigns,
  className = "",
  showHeader = true,
  maxCampaigns = DEFAULT_MAX_NEARBY_CAMPAIGNS,
}: NearbyCampaignMapProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>("idle");
  const [userLocation, setUserLocation] = useState<CampaignCoordinates | null>(
    null
  );

  const locateUser = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (!navigator.geolocation) {
      setLocationStatus("unsupported");
      return;
    }

    setLocationStatus("locating");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setLocationStatus("ready");
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setLocationStatus("denied");
          return;
        }
        setLocationStatus("error");
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 }
    );
  }, []);

  useEffect(() => {
    locateUser();
  }, [locateUser]);

  const normalizedMaxCampaigns = useMemo(() => {
    if (!Number.isFinite(maxCampaigns)) {
      return DEFAULT_MAX_NEARBY_CAMPAIGNS;
    }
    return Math.max(1, Math.trunc(maxCampaigns));
  }, [maxCampaigns]);

  const sortedCampaigns = useMemo<CampaignWithDistance[]>(() => {
    return campaigns
      .filter((campaign) => campaign.coordinates !== null)
      .map((campaign) => {
        const coordinates = campaign.coordinates as CampaignCoordinates;
        const distanceKm = userLocation
          ? calculateDistanceKm(userLocation, coordinates)
          : calculateDistanceKm(FALLBACK_LOCATION, coordinates);

        return { campaign, distanceKm };
      })
      .sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
  }, [campaigns, userLocation]);

  const nearbyCampaigns = useMemo(() => {
    if (!sortedCampaigns.length) {
      return [];
    }

    if (!userLocation) {
      return sortedCampaigns.slice(0, normalizedMaxCampaigns);
    }

    const matched = sortedCampaigns.filter(
      (item) => item.distanceKm !== null && item.distanceKm <= NEARBY_RADIUS_KM
    );

    if (matched.length) {
      return matched.slice(0, normalizedMaxCampaigns);
    }

    return sortedCampaigns.slice(0, normalizedMaxCampaigns);
  }, [normalizedMaxCampaigns, sortedCampaigns, userLocation]);

  const mapCenter = userLocation ?? FALLBACK_LOCATION;

  useEffect(() => {
    if (!mapRef.current || !nearbyCampaigns.length) {
      return;
    }

    let mapInstance: import("leaflet").Map | null = null;
    let isDisposed = false;

    const renderMap = async () => {
      const L = await import("leaflet");
      if (isDisposed || !mapRef.current) {
        return;
      }

      mapInstance = L.map(mapRef.current, {
        zoomControl: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(mapInstance);

      const bounds = L.latLngBounds([[mapCenter.latitude, mapCenter.longitude]]);

      const userMarker = L.circleMarker(
        [mapCenter.latitude, mapCenter.longitude],
        {
          radius: 8,
          color: "#1d4ed8",
          fillColor: "#2563eb",
          fillOpacity: 1,
          weight: 2,
        }
      ).addTo(mapInstance);

      userMarker.bindPopup(
        userLocation ? "Your location" : "Default location (Ho Chi Minh City)"
      );

      nearbyCampaigns.forEach((item) => {
        const marker = L.circleMarker(
          [
            (item.campaign.coordinates as CampaignCoordinates).latitude,
            (item.campaign.coordinates as CampaignCoordinates).longitude,
          ],
          {
            radius: 9,
            color: "#c2410c",
            fillColor: "#fb923c",
            fillOpacity: 0.95,
            weight: 2,
          }
        ).addTo(mapInstance as import("leaflet").Map);

        marker.bindPopup(
          `<strong>${escapeHtml(item.campaign.title)}</strong><br/>` +
            `${escapeHtml(item.campaign.location)}<br/>` +
            `Distance: ${formatDistance(item.distanceKm)}`
        );

        bounds.extend([
          (item.campaign.coordinates as CampaignCoordinates).latitude,
          (item.campaign.coordinates as CampaignCoordinates).longitude,
        ]);
      });

      if (bounds.isValid()) {
        mapInstance.fitBounds(bounds.pad(0.2));
      } else {
        mapInstance.setView([mapCenter.latitude, mapCenter.longitude], 12);
      }
    };

    renderMap();

    return () => {
      isDisposed = true;
      if (mapInstance) {
        mapInstance.remove();
      }
    };
  }, [mapCenter, nearbyCampaigns, userLocation]);

  return (
    <section className={`card-base p-5 md:p-6 ${className}`.trim()}>
      {showHeader ? (
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-bold text-heading">Campaigns near you</h2>
            <p className="mt-1 text-sm text-text-muted">
              {getLocationMessage(locationStatus)}
            </p>
          </div>
          <button
            type="button"
            onClick={locateUser}
            disabled={locationStatus === "locating"}
            className="btn-base btn-secondary disabled:cursor-not-allowed disabled:opacity-60"
          >
            {locationStatus === "locating"
              ? "Checking location..."
              : "Refresh location"}
          </button>
        </div>
      ) : null}

      <div
        className={`${showHeader ? "mt-5" : ""} grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]`.trim()}
      >
        <div className="overflow-hidden rounded-xl border border-border bg-surface-muted">
          <div ref={mapRef} className="nearby-map h-[360px] w-full" />
        </div>

        <div className="space-y-3">
          {nearbyCampaigns.map((item) => (
            <article
              key={item.campaign.id}
              className="rounded-xl border border-border bg-surface p-4"
            >
              <p className="text-sm font-semibold text-primary">
                {formatDistance(item.distanceKm)}
              </p>
              <h3 className="mt-1 text-base font-bold text-heading">
                {item.campaign.title}
              </h3>
              <p className="mt-1 text-sm text-text-muted">{item.campaign.location}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
