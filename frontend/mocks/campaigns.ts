import type { Campaign } from "@/types/campaign";

export const campaigns: Campaign[] = [
  {
    id: "camp-1",
    slug: "flood-relief-thu-duc",
    title: "Flood Relief Support for Thu Duc Families",
    shortDescription:
      "Coordinate donations, volunteers, and delivery support for affected households.",
    description:
      "This campaign supports families impacted by heavy flooding in Thu Duc. Organization manages beneficiary verification, support rounds, donation tracking, and public transparency logs.",
    location: "Thu Duc, HCMC",
    organizationId: "org-1",
    status: "active",
    tags: ["flood", "emergency", "community"],
    targetAmount: 100000000,
    raisedAmount: 45000000,
    beneficiaryCount: 120,
    supporterCount: 84,
    needs: [
      { label: "Clean water", value: "600 bottles" },
      { label: "Food packs", value: "300 packs" },
      { label: "Volunteers", value: "20 people" },
      { label: "Shippers", value: "8 people" },
    ],
    coverImage:
      "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=1200&q=80",
    createdAt: "2026-03-20T09:00:00Z",
  },
  {
    id: "camp-2",
    slug: "school-aid-binh-chanh",
    title: "School Supply Aid for Children in Binh Chanh",
    shortDescription:
      "Collect essential school items and organize volunteer distribution.",
    description:
      "The campaign focuses on school supply support for children in low-income households. Supporters can donate money, goods, or join volunteer tasks.",
    location: "Binh Chanh, HCMC",
    organizationId: "org-1",
    status: "active",
    tags: ["education", "children"],
    targetAmount: 50000000,
    raisedAmount: 21000000,
    beneficiaryCount: 75,
    supporterCount: 46,
    needs: [
      { label: "Backpacks", value: "100" },
      { label: "Notebooks", value: "500" },
      { label: "Volunteers", value: "10 people" },
    ],
    coverImage:
      "https://images.unsplash.com/photo-1509062522246-3755977927d7?w=1200&q=80",
    createdAt: "2026-03-19T07:30:00Z",
  },
];