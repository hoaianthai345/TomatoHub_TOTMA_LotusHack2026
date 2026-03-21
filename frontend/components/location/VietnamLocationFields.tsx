"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getVietnamDistricts,
  getVietnamProvinces,
  getVietnamWards,
  VietnamLocationApiError,
} from "@/lib/api/vietnam-location";
import type {
  VietnamDistrict,
  VietnamLocationValue,
  VietnamProvince,
  VietnamWard,
} from "@/types/location";

interface VietnamLocationFieldsProps {
  value: VietnamLocationValue;
  onChange: (nextValue: VietnamLocationValue) => void;
  includeWard?: boolean;
  includeAddressLine?: boolean;
  disabled?: boolean;
  labels?: {
    province?: string;
    district?: string;
    ward?: string;
    addressLine?: string;
  };
  helperText?: string;
}

export default function VietnamLocationFields({
  value,
  onChange,
  includeWard = true,
  includeAddressLine = false,
  disabled = false,
  labels,
  helperText,
}: VietnamLocationFieldsProps) {
  const [provinces, setProvinces] = useState<VietnamProvince[]>([]);
  const [districts, setDistricts] = useState<VietnamDistrict[]>([]);
  const [wards, setWards] = useState<VietnamWard[]>([]);
  const [isLoadingProvinces, setIsLoadingProvinces] = useState(true);
  const [isLoadingDistricts, setIsLoadingDistricts] = useState(false);
  const [isLoadingWards, setIsLoadingWards] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadProvinces = async () => {
      setIsLoadingProvinces(true);
      try {
        const response = await getVietnamProvinces();
        if (!cancelled) {
          setProvinces(response);
          setErrorMessage(null);
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(
            error instanceof VietnamLocationApiError
              ? error.message
              : "Failed to load provinces."
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoadingProvinces(false);
        }
      }
    };

    loadProvinces();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!value.provinceCode) {
      setDistricts([]);
      return;
    }

    let cancelled = false;

    const loadDistricts = async () => {
      setIsLoadingDistricts(true);
      try {
        const response = await getVietnamDistricts(value.provinceCode!);
        if (!cancelled) {
          setDistricts(response);
          setErrorMessage(null);
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(
            error instanceof VietnamLocationApiError
              ? error.message
              : "Failed to load districts."
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoadingDistricts(false);
        }
      }
    };

    loadDistricts();

    return () => {
      cancelled = true;
    };
  }, [value.provinceCode]);

  useEffect(() => {
    if (!includeWard || !value.districtCode) {
      setWards([]);
      return;
    }

    let cancelled = false;

    const loadWards = async () => {
      setIsLoadingWards(true);
      try {
        const response = await getVietnamWards(value.districtCode!);
        if (!cancelled) {
          setWards(response);
          setErrorMessage(null);
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(
            error instanceof VietnamLocationApiError
              ? error.message
              : "Failed to load wards."
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoadingWards(false);
        }
      }
    };

    loadWards();

    return () => {
      cancelled = true;
    };
  }, [includeWard, value.districtCode]);

  const provinceOptions = useMemo(
    () => provinces.map((province) => ({ value: String(province.code), label: province.name })),
    [provinces]
  );
  const districtOptions = useMemo(
    () => districts.map((district) => ({ value: String(district.code), label: district.name })),
    [districts]
  );
  const wardOptions = useMemo(
    () => wards.map((ward) => ({ value: String(ward.code), label: ward.name })),
    [wards]
  );

  const handleProvinceChange = (provinceCodeValue: string) => {
    if (!provinceCodeValue) {
      onChange({
        addressLine: value.addressLine,
      });
      return;
    }

    const provinceCode = Number(provinceCodeValue);
    const province = provinces.find((item) => item.code === provinceCode);

    onChange({
      provinceCode,
      provinceName: province?.name,
      addressLine: value.addressLine,
    });
  };

  const handleDistrictChange = (districtCodeValue: string) => {
    if (!districtCodeValue) {
      onChange({
        ...value,
        districtCode: undefined,
        districtName: undefined,
        wardCode: undefined,
        wardName: undefined,
      });
      return;
    }

    const districtCode = Number(districtCodeValue);
    const district = districts.find((item) => item.code === districtCode);

    onChange({
      ...value,
      districtCode,
      districtName: district?.name,
      wardCode: undefined,
      wardName: undefined,
    });
  };

  const handleWardChange = (wardCodeValue: string) => {
    if (!wardCodeValue) {
      onChange({
        ...value,
        wardCode: undefined,
        wardName: undefined,
      });
      return;
    }

    const wardCode = Number(wardCodeValue);
    const ward = wards.find((item) => item.code === wardCode);

    onChange({
      ...value,
      wardCode,
      wardName: ward?.name,
    });
  };

  return (
    <div className="grid gap-4">
      <div className={`grid gap-4 ${includeWard ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
        <label className="grid gap-2 text-sm text-text">
          <span>{labels?.province ?? "Province / City"}</span>
          <select
            className="input-base"
            value={value.provinceCode ? String(value.provinceCode) : ""}
            onChange={(event) => handleProvinceChange(event.target.value)}
            disabled={disabled || isLoadingProvinces}
          >
            <option value="">
              {isLoadingProvinces ? "Loading provinces..." : "Select province / city"}
            </option>
            {provinceOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2 text-sm text-text">
          <span>{labels?.district ?? "District"}</span>
          <select
            className="input-base"
            value={value.districtCode ? String(value.districtCode) : ""}
            onChange={(event) => handleDistrictChange(event.target.value)}
            disabled={disabled || !value.provinceCode || isLoadingDistricts}
          >
            <option value="">
              {!value.provinceCode
                ? "Select province first"
                : isLoadingDistricts
                  ? "Loading districts..."
                  : "Select district"}
            </option>
            {districtOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        {includeWard ? (
          <label className="grid gap-2 text-sm text-text">
            <span>{labels?.ward ?? "Ward / Commune"}</span>
            <select
              className="input-base"
              value={value.wardCode ? String(value.wardCode) : ""}
              onChange={(event) => handleWardChange(event.target.value)}
              disabled={disabled || !value.districtCode || isLoadingWards}
            >
              <option value="">
                {!value.districtCode
                  ? "Select district first"
                  : isLoadingWards
                    ? "Loading wards..."
                    : "Select ward / commune"}
              </option>
              {wardOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      {includeAddressLine ? (
        <label className="grid gap-2 text-sm text-text">
          <span>{labels?.addressLine ?? "Address line"}</span>
          <input
            className="input-base"
            value={value.addressLine ?? ""}
            onChange={(event) =>
              onChange({
                ...value,
                addressLine: event.target.value,
              })
            }
            disabled={disabled}
            placeholder="Street, hamlet, building..."
          />
        </label>
      ) : null}

      {helperText ? (
        <p className="text-xs text-text-muted">{helperText}</p>
      ) : null}

      {errorMessage ? (
        <p className="rounded-lg border border-danger/20 bg-danger/5 p-3 text-sm text-danger">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
