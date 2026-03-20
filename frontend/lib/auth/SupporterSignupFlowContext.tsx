"use client";

import React, { createContext, useContext, useMemo, useState } from "react";
import type { SupporterSignupDraft } from "@/types/user";

interface SupporterSignupFlowContextValue {
  draft: SupporterSignupDraft | null;
  saveDraft: (draft: SupporterSignupDraft) => void;
  clearDraft: () => void;
}

const SupporterSignupFlowContext = createContext<
  SupporterSignupFlowContextValue | undefined
>(undefined);

interface SupporterSignupFlowProviderProps {
  children: React.ReactNode;
}

export function SupporterSignupFlowProvider({
  children,
}: SupporterSignupFlowProviderProps) {
  const [draft, setDraft] = useState<SupporterSignupDraft | null>(null);

  const value = useMemo<SupporterSignupFlowContextValue>(
    () => ({
      draft,
      saveDraft: setDraft,
      clearDraft: () => setDraft(null),
    }),
    [draft]
  );

  return (
    <SupporterSignupFlowContext.Provider value={value}>
      {children}
    </SupporterSignupFlowContext.Provider>
  );
}

export function useSupporterSignupFlow(): SupporterSignupFlowContextValue {
  const context = useContext(SupporterSignupFlowContext);
  if (context === undefined) {
    throw new Error(
      "useSupporterSignupFlow must be used within SupporterSignupFlowProvider"
    );
  }
  return context;
}
