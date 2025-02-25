// stores/slices/createHistorySlice.ts
import 'react-native-get-random-values'; // Denna import MÅSTE vara först!
import { StateCreator } from 'zustand';
import { HistorySlice, ScannedProduct, StoreState } from '../types';
import { v4 as uuidv4 } from 'uuid';

export const createHistorySlice: StateCreator<
  StoreState,
  [],
  [],
  HistorySlice
> = (set) => ({
  products: [],

  addProduct: (productData) =>
    set((state) => ({
      products: [
        {
          ...productData,
          id: uuidv4(),
          timestamp: new Date().toISOString(),
          isFavorite: false,
        },
        ...state.products,
      ],
    })),

  removeProduct: (id) =>
    set((state) => ({
      products: state.products.filter((product) => product.id !== id),
    })),

  toggleFavorite: (id) =>
    set((state) => ({
      products: state.products.map((product) =>
        product.id === id
          ? { ...product, isFavorite: !product.isFavorite }
          : product
      ),
    })),

  clearHistory: () => set({ products: [] }),
});