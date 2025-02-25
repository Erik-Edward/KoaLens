// stores/slices/createAvatarSlice.ts
import { StateCreator } from 'zustand';
import { StoreState } from '../types';

export type AvatarStyle = 'cute' | 'cool' | 'supporter';

export interface AvatarState {
  style: AvatarStyle;
  id: string | null;
  veganYears: number;
}

export interface AvatarSlice {
  avatar: AvatarState;
  setAvatar: (style: AvatarStyle, id: string) => void;
  setVeganYears: (years: number) => void;
  resetAvatar: () => void;
}

const initialState: AvatarState = {
  style: 'cute',
  id: null,
  veganYears: 0
};

export const createAvatarSlice: StateCreator<
  StoreState,
  [],
  [],
  AvatarSlice
> = (set) => ({
  avatar: initialState,
  
  setAvatar: (style, id) =>
    set((state) => ({
      avatar: {
        ...state.avatar,
        style,
        id
      }
    })),

  setVeganYears: (years) =>
    set((state) => ({
      avatar: {
        ...state.avatar,
        veganYears: years
      }
    })),

  resetAvatar: () =>
    set({
      avatar: initialState
    })
});