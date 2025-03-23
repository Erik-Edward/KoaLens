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
> = (set, get) => ({
  veganStatus: initialState,
  
  setVeganStatus: async (status) => {
    console.log('VeganStatusSlice: Setting vegan status from', get().veganStatus.status, 'to', status);
    set((state) => {
      const newState = {
        veganStatus: {
          ...state.veganStatus,
          status
        }
      };
      console.log('VeganStatusSlice: New state created:', newState.veganStatus);
      return newState;
    });
    console.log('VeganStatusSlice: Status after update:', get().veganStatus.status);
  },

  resetVeganStatus: async () => {
    console.log('VeganStatusSlice: Resetting vegan status');
    set({ veganStatus: initialState });
  }
});