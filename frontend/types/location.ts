export interface VietnamProvince {
  code: number;
  name: string;
  codename: string;
  divisionType: string;
  phoneCode?: number;
}

export interface VietnamDistrict {
  code: number;
  name: string;
  codename: string;
  divisionType: string;
  provinceCode: number;
}

export interface VietnamWard {
  code: number;
  name: string;
  codename: string;
  divisionType: string;
  districtCode: number;
  provinceCode: number;
}

export interface VietnamLocationValue {
  provinceCode?: number;
  provinceName?: string;
  districtCode?: number;
  districtName?: string;
  wardCode?: number;
  wardName?: string;
  addressLine?: string;
}
