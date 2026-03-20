import { useContext } from "react";
import { AuthContext } from "./AuthContext";
import type { AuthContextType } from "./types";

/**
 * Hook to use auth context in components
 * Must be used within AuthProvider
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
