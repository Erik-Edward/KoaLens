// stores/slices/createVeganStatusSlice.ts
import { StateCreator } from 'zustand';
import { StoreState } from '../types';

export type VeganStatus = 'vegan' | 'supporter';

export interface VeganStatusState {
  status: VeganStatus | null;
}

export interface VeganStatusSlice {
  veganStatus: VeganStatusState;
  setVeganStatus: (status: VeganStatus) => Promise<void>;
  resetVeganStatus: () => Promise<void>;
}

const initialState: VeganStatusState = {
  status: null
};

export const createVeganStatusSlice: StateCreator<
  StoreState,
  [],
  [],
  VeganStatusSlice
> = (set) => ({
  veganStatus: initialState,
  
  setVeganStatus: async (status) => {
    set((state) => ({
      veganStatus: {
        ...state.veganStatus,
        status
      }
    }));
  },

  resetVeganStatus: async () => {
    set({ veganStatus: initialState });
  }
});