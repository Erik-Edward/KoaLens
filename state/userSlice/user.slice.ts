// Stub för userSlice som importeras i AuthProvider
export interface UserState {
  id: string | null;
  email: string | null;
  veganStatus: string | null;
  avatar_url?: string | null;
  username?: string | null;
  first_name?: string | null;
  last_name?: string | null;
}

export const userSlice = {
  name: 'user',
  // Lägg till updateUser-funktion som används i AuthProvider.tsx
  actions: {
    updateUser: (user: Partial<UserState>) => {}
  }
};

// För att göra funktionen tillgänglig via useStore.getState()
export const updateUser = (user: Partial<UserState>) => {}; 