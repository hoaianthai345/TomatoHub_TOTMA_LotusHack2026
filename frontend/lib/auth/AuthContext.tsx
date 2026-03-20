"use client";

import React, { createContext, useCallback, useEffect, useState } from "react";
import {
  getMeApi,
  loginApi,
  signupOrganizationApi,
  signupSupporterApi,
} from "./api";
import {
  AUTH_COOKIE_MAX_AGE,
  AUTH_ROLE_COOKIE_KEY,
  AUTH_STORAGE_ROLE_KEY,
  AUTH_TOKEN_COOKIE_KEY,
  AUTH_TOKEN_STORAGE_KEY,
  AUTH_USER_STORAGE_KEY,
} from "./constants";
import type {
  AuthContextType,
  CurrentUser,
  LoginPayload,
  OrganizationSignupPayload,
  SupporterSignupPayload,
} from "./types";

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

function setAuthCookies(token: string, role: CurrentUser["role"]) {
  document.cookie = `${AUTH_TOKEN_COOKIE_KEY}=${encodeURIComponent(token)}; Path=/; Max-Age=${AUTH_COOKIE_MAX_AGE}; SameSite=Lax`;
  document.cookie = `${AUTH_ROLE_COOKIE_KEY}=${encodeURIComponent(role)}; Path=/; Max-Age=${AUTH_COOKIE_MAX_AGE}; SameSite=Lax`;
}

function clearAuthCookies() {
  document.cookie = `${AUTH_TOKEN_COOKIE_KEY}=; Path=/; Max-Age=0; SameSite=Lax`;
  document.cookie = `${AUTH_ROLE_COOKIE_KEY}=; Path=/; Max-Age=0; SameSite=Lax`;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const clearAuthStorage = useCallback(() => {
    localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    localStorage.removeItem(AUTH_USER_STORAGE_KEY);
    localStorage.removeItem(AUTH_STORAGE_ROLE_KEY);
    clearAuthCookies();
    setAccessToken(null);
    setCurrentUser(null);
  }, []);

  const persistAuth = useCallback((token: string, user: CurrentUser) => {
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
    localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(user));
    localStorage.setItem(AUTH_STORAGE_ROLE_KEY, user.role);
    setAuthCookies(token, user.role);
    setAccessToken(token);
    setCurrentUser(user);
  }, []);

  const refreshCurrentUser = useCallback(async () => {
    const token = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
    if (!token) {
      setAccessToken(null);
      setCurrentUser(null);
      return;
    }

    try {
      const user = await getMeApi(token);
      persistAuth(token, user);
    } catch (error) {
      console.error("Failed to refresh current user:", error);
      clearAuthStorage();
      throw error;
    }
  }, [clearAuthStorage, persistAuth]);

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        await refreshCurrentUser();
      } catch {
        // Auth state already cleaned in refreshCurrentUser().
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    initializeAuth();

    return () => {
      mounted = false;
    };
  }, [refreshCurrentUser]);

  const login = useCallback(
    async (payload: LoginPayload) => {
      setIsLoading(true);
      try {
        const { token, user } = await loginApi(payload);
        persistAuth(token, user);
        return user;
      } finally {
        setIsLoading(false);
      }
    },
    [persistAuth]
  );

  const signupSupporter = useCallback(
    async (payload: SupporterSignupPayload) => {
      setIsLoading(true);
      try {
        const { token, user } = await signupSupporterApi(payload);
        persistAuth(token, user);
        return user;
      } finally {
        setIsLoading(false);
      }
    },
    [persistAuth]
  );

  const signupOrganization = useCallback(
    async (payload: OrganizationSignupPayload) => {
      setIsLoading(true);
      try {
        const { token, user } = await signupOrganizationApi(payload);
        persistAuth(token, user);
        return user;
      } finally {
        setIsLoading(false);
      }
    },
    [persistAuth]
  );

  const logout = useCallback(() => {
    clearAuthStorage();
  }, [clearAuthStorage]);

  const value: AuthContextType = {
    currentUser,
    accessToken,
    isLoading,
    login,
    logout,
    signupSupporter,
    signupOrganization,
    refreshCurrentUser,
    isAuthenticated: currentUser !== null,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
