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
    status: "published",
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
    coordinates: {
      latitude: 10.8489,
      longitude: 106.7727,
    },
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
    status: "published",
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
    coordinates: {
      latitude: 10.6958,
      longitude: 106.5967,
    },
    createdAt: "2026-03-19T07:30:00Z",
  },
  {
    id: "camp-3",
    slug: "medical-support-go-vap",
    title: "Emergency Medical Support in Go Vap",
    shortDescription:
      "Raise funds and recruit healthcare volunteers for urgent home care needs.",
    description:
      "This campaign focuses on emergency medicine packages, basic diagnostics, and volunteer nurse shifts for elderly residents in Go Vap.",
    location: "Go Vap, HCMC",
    organizationId: "org-2",
    status: "published",
    tags: ["medical", "elderly", "urgent"],
    targetAmount: 75000000,
    raisedAmount: 38000000,
    beneficiaryCount: 62,
    supporterCount: 51,
    needs: [
      { label: "Medicine kits", value: "160 sets" },
      { label: "Volunteer nurses", value: "12 people" },
      { label: "Blood pressure monitors", value: "25 devices" },
    ],
    coverImage:
      "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=1200&q=80",
    coordinates: {
      latitude: 10.8386,
      longitude: 106.6659,
    },
    createdAt: "2026-03-18T11:15:00Z",
  },
  {
    id: "camp-4",
    slug: "food-packages-hoc-mon",
    title: "Food Package Delivery for Hoc Mon Families",
    shortDescription:
      "Coordinate dry food donations and transport support for suburban households.",
    description:
      "Organization teams are preparing weekly food package distribution for low-income families in Hoc Mon with transparent check-in logs.",
    location: "Hoc Mon, HCMC",
    organizationId: "org-2",
    status: "published",
    tags: ["food", "delivery", "community"],
    targetAmount: 60000000,
    raisedAmount: 26000000,
    beneficiaryCount: 98,
    supporterCount: 57,
    needs: [
      { label: "Rice", value: "2,500 kg" },
      { label: "Dry food boxes", value: "350 boxes" },
      { label: "Shippers", value: "14 people" },
    ],
    coverImage:
      "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=1200&q=80",
    coordinates: {
      latitude: 10.8897,
      longitude: 106.5946,
    },
    createdAt: "2026-03-17T06:45:00Z",
  },
  {
    id: "camp-5",
    slug: "heat-relief-binh-thanh-workers",
    title: "Heat Relief Support for Binh Thanh Workers",
    shortDescription:
      "Fund cooling stations, hydration kits, and volunteer shifts for outdoor workers during peak heat days.",
    description:
      "This campaign helps delivery riders, sanitation teams, and street-side workers in Binh Thanh with hydration points, cooling breaks, and emergency support supplies coordinated by the local organization team.",
    location: "Binh Thanh, HCMC",
    organizationId: "org-1",
    status: "published",
    tags: ["heatwave", "workers", "health", "community"],
    targetAmount: 85000000,
    raisedAmount: 32000000,
    beneficiaryCount: 140,
    supporterCount: 63,
    needs: [
      { label: "Hydration kits", value: "500 kits" },
      { label: "Cooling fans", value: "40 units" },
      { label: "Volunteer shifts", value: "18 people" },
      { label: "Medical check desks", value: "4 desks" },
    ],
    coverImage:
      "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=1200&q=80",
    coordinates: {
      latitude: 10.8106,
      longitude: 106.7091,
    },
    createdAt: "2026-03-16T10:20:00Z",
  },
];
