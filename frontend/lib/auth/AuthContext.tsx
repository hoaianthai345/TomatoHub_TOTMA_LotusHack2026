"use client";

import React, { createContext, useCallback, useEffect, useState } from "react";
import type { CurrentUser, AuthContextType } from "./types";
import { allMockUsers, mockGuestUser } from "./mockUsers";
import { AUTH_STORAGE_KEY } from "./constants";

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize auth from localStorage on mount
  useEffect(() => {
    const initializeAuth = () => {
      try {
        const storedUserId = localStorage.getItem(AUTH_STORAGE_KEY);
        if (storedUserId && allMockUsers[storedUserId]) {
          setCurrentUser(allMockUsers[storedUserId]);
        } else {
          setCurrentUser(mockGuestUser);
        }
      } catch (error) {
        console.error("Failed to initialize auth:", error);
        setCurrentUser(mockGuestUser);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = useCallback(async (userId: string) => {
    setIsLoading(true);
    try {
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 300));

      const user = allMockUsers[userId];
      if (!user) {
        throw new Error("User not found");
      }

      setCurrentUser(user);
      localStorage.setItem(AUTH_STORAGE_KEY, userId);
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setCurrentUser(mockGuestUser);
    localStorage.removeItem(AUTH_STORAGE_KEY);
  }, []);

  const signup = useCallback(
    async (userData: Partial<CurrentUser>) => {
      setIsLoading(true);
      try {
        // Simulate API delay
        await new Promise((resolve) => setTimeout(resolve, 300));

        // Create new user with mock ID
        const newUserId =
          userData.role === "organization"
            ? `org-${Date.now()}`
            : `sup-${Date.now()}`;

        const newUser: CurrentUser = {
          id: newUserId,
          name: userData.name || "New User",
          role: userData.role || "supporter",
          email: userData.email,
          location: userData.location,
          supportTypes: userData.supportTypes,
        };

        setCurrentUser(newUser);
        localStorage.setItem(AUTH_STORAGE_KEY, newUserId);
      } catch (error) {
        console.error("Signup failed:", error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const value: AuthContextType = {
    currentUser,
    isLoading,
    login,
    logout,
    signup,
    isAuthenticated: currentUser !== null && currentUser.role !== "guest",
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
