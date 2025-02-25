// stores/slices/createOnboardingSlice.ts
import { StateCreator } from 'zustand';
import { StoreState } from '../types';

export interface OnboardingState {
  hasCompletedOnboarding: boolean;
  hasAcceptedDisclaimer: boolean;
  currentStep: number;
}

export interface OnboardingSlice {
  onboarding: OnboardingState;
  setOnboardingCompleted: (completed: boolean) => Promise<void>;
  setDisclaimerAccepted: (accepted: boolean) => Promise<void>;
  setCurrentStep: (step: number) => Promise<void>;
  resetOnboarding: () => Promise<void>;
}

const initialState: OnboardingState = {
  hasCompletedOnboarding: false,
  hasAcceptedDisclaimer: false,
  currentStep: 0
};

export const createOnboardingSlice: StateCreator<
  StoreState,
  [],
  [],
  OnboardingSlice
> = (set) => ({
  onboarding: initialState,

  setOnboardingCompleted: async (completed) => {
    set((state) => ({
      onboarding: {
        ...state.onboarding,
        hasCompletedOnboarding: completed
      }
    }));
  },

  setDisclaimerAccepted: async (accepted) => {
    set((state) => ({
      onboarding: {
        ...state.onboarding,
        hasAcceptedDisclaimer: accepted
      }
    }));
  },

  setCurrentStep: async (step) => {
    set((state) => ({
      onboarding: {
        ...state.onboarding,
        currentStep: step
      }
    }));
  },

  resetOnboarding: async () => {
    set({ onboarding: initialState });
  }
});