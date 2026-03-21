import type {
  VietnamDistrict,
  VietnamLocationValue,
  VietnamProvince,
  VietnamWard,
} from "@/types/location";

const VIETNAM_LOCATION_API_BASE_URL = (
  process.env.NEXT_PUBLIC_VN_ADMIN_API_BASE_URL ??
  "https://provinces.open-api.vn/api/v1"
).replace(/\/+$/, "");

interface ProvinceDetailResponse extends BackendProvince {
  districts?: BackendDistrict[];
}

interface DistrictDetailResponse extends BackendDistrict {
  wards?: BackendWard[];
}

interface BackendProvince {
  code: number;
  name: string;
  codename: string;
  division_type: string;
  phone_code?: number;
}

interface BackendDistrict {
  code: number;
  name: string;
  codename: string;
  division_type: string;
  province_code: number;
}

interface BackendWard {
  code: number;
  name: string;
  codename: string;
  division_type: string;
  district_code: number;
  province_code: number;
}

export class VietnamLocationApiError extends Error {}

let provinceCache: VietnamProvince[] | null = null;
let provinceRequest: Promise<VietnamProvince[]> | null = null;

const districtCache = new Map<number, VietnamDistrict[]>();
const districtRequests = new Map<number, Promise<VietnamDistrict[]>>();

const wardCache = new Map<number, VietnamWard[]>();
const wardRequests = new Map<number, Promise<VietnamWard[]>>();

function mapProvince(item: BackendProvince): VietnamProvince {
  return {
    code: item.code,
    name: item.name,
    codename: item.codename,
    divisionType: item.division_type,
    phoneCode: item.phone_code,
  };
}

function mapDistrict(item: BackendDistrict): VietnamDistrict {
  return {
    code: item.code,
    name: item.name,
    codename: item.codename,
    divisionType: item.division_type,
    provinceCode: item.province_code,
  };
}

function mapWard(item: BackendWard): VietnamWard {
  return {
    code: item.code,
    name: item.name,
    codename: item.codename,
    divisionType: item.division_type,
    districtCode: item.district_code,
    provinceCode: item.province_code,
  };
}

async function requestVietnamLocationJson<T>(path: string): Promise<T> {
  const response = await fetch(`${VIETNAM_LOCATION_API_BASE_URL}${path}`, {
    cache: "force-cache",
  });

  if (!response.ok) {
    throw new VietnamLocationApiError(
      `Vietnam location API request failed with status ${response.status}.`
    );
  }

  return response.json() as Promise<T>;
}

export async function getVietnamProvinces(): Promise<VietnamProvince[]> {
  if (provinceCache) {
    return provinceCache;
  }

  if (!provinceRequest) {
    provinceRequest = requestVietnamLocationJson<BackendProvince[]>("/p/")
      .then((response) => {
        const provinces = response.map(mapProvince);
        provinceCache = provinces;
        return provinces;
      })
      .catch((error) => {
        provinceRequest = null;
        throw error;
      });
  }

  return provinceRequest;
}

export async function getVietnamDistricts(
  provinceCode: number
): Promise<VietnamDistrict[]> {
  const cached = districtCache.get(provinceCode);
  if (cached) {
    return cached;
  }

  const activeRequest = districtRequests.get(provinceCode);
  if (activeRequest) {
    return activeRequest;
  }

  const request = requestVietnamLocationJson<ProvinceDetailResponse>(
    `/p/${provinceCode}?depth=2`
  )
    .then((response) => {
      const districts = (response.districts ?? []).map(mapDistrict);
      districtCache.set(provinceCode, districts);
      districtRequests.delete(provinceCode);
      return districts;
    })
    .catch((error) => {
      districtRequests.delete(provinceCode);
      throw error;
    });

  districtRequests.set(provinceCode, request);
  return request;
}

export async function getVietnamWards(
  districtCode: number
): Promise<VietnamWard[]> {
  const cached = wardCache.get(districtCode);
  if (cached) {
    return cached;
  }

  const activeRequest = wardRequests.get(districtCode);
  if (activeRequest) {
    return activeRequest;
  }

  const request = requestVietnamLocationJson<DistrictDetailResponse>(
    `/d/${districtCode}?depth=2`
  )
    .then((response) => {
      const wards = (response.wards ?? []).map(mapWard);
      wardCache.set(districtCode, wards);
      wardRequests.delete(districtCode);
      return wards;
    })
    .catch((error) => {
      wardRequests.delete(districtCode);
      throw error;
    });

  wardRequests.set(districtCode, request);
  return request;
}

export function formatVietnamLocationLabel(
  value: VietnamLocationValue,
  options: { includeAddressLine?: boolean } = {}
): string {
  const segments = [
    options.includeAddressLine ? value.addressLine : undefined,
    value.wardName,
    value.districtName,
    value.provinceName,
  ]
    .map((segment) => segment?.trim())
    .filter(Boolean);

  return segments.join(", ");
}
