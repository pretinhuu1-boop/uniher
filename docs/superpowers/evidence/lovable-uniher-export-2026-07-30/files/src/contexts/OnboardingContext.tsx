import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface OnboardingContextType {
  isFirstAccess: boolean;
  hasCompletedOnboarding: boolean;
  completeOnboarding: () => void;
  resetOnboarding: () => void;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

const ONBOARDING_KEY = "uniher_onboarding_completed";

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<boolean>(() => {
    const stored = localStorage.getItem(ONBOARDING_KEY);
    return stored === "true";
  });

  const [isFirstAccess] = useState<boolean>(() => {
    const stored = localStorage.getItem(ONBOARDING_KEY);
    return stored === null;
  });

  const completeOnboarding = () => {
    localStorage.setItem(ONBOARDING_KEY, "true");
    setHasCompletedOnboarding(true);
  };

  const resetOnboarding = () => {
    localStorage.removeItem(ONBOARDING_KEY);
    setHasCompletedOnboarding(false);
  };

  return (
    <OnboardingContext.Provider 
      value={{ 
        isFirstAccess, 
        hasCompletedOnboarding, 
        completeOnboarding, 
        resetOnboarding 
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error("useOnboarding must be used within an OnboardingProvider");
  }
  return context;
}
