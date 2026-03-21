interface MarkerColorSet {
  userStroke: string;
  userFill: string;
  campaignStroke: string;
  campaignFill: string;
  campaignSecondaryStroke: string;
  campaignSecondaryFill: string;
}

const DEFAULT_MARKER_COLORS: MarkerColorSet = {
  userStroke: "var(--color-info)",
  userFill: "var(--color-info)",
  campaignStroke: "var(--color-primary)",
  campaignFill: "var(--color-primary)",
  campaignSecondaryStroke: "var(--color-secondary)",
  campaignSecondaryFill: "var(--color-secondary)",
};

function readColorToken(tokenName: string, fallback: string): string {
  if (typeof window === "undefined") {
    return fallback;
  }

  const tokenValue = getComputedStyle(document.documentElement)
    .getPropertyValue(tokenName)
    .trim();
  return tokenValue || fallback;
}

export function getMapMarkerColors(): MarkerColorSet {
  return {
    userStroke: readColorToken("--map-user-stroke", DEFAULT_MARKER_COLORS.userStroke),
    userFill: readColorToken("--map-user-fill", DEFAULT_MARKER_COLORS.userFill),
    campaignStroke: readColorToken(
      "--map-campaign-stroke",
      DEFAULT_MARKER_COLORS.campaignStroke
    ),
    campaignFill: readColorToken("--map-campaign-fill", DEFAULT_MARKER_COLORS.campaignFill),
    campaignSecondaryStroke: readColorToken(
      "--map-campaign-secondary-stroke",
      DEFAULT_MARKER_COLORS.campaignSecondaryStroke
    ),
    campaignSecondaryFill: readColorToken(
      "--map-campaign-secondary-fill",
      DEFAULT_MARKER_COLORS.campaignSecondaryFill
    ),
  };
}
