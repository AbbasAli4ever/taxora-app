import { create } from 'zustand';
import { ColorScheme } from '@config/nativewind';

interface AppState {
  isReady:    boolean;
  theme:      ColorScheme;
  setReady:   (ready: boolean) => void;
  setTheme:   (theme: ColorScheme) => void;
  toggleTheme:() => void;
}

export const useAppStore = create<AppState>((set) => ({
  isReady:  false,
  theme:    'light',

  setReady:    (isReady) => set({ isReady }),
  setTheme:    (theme)   => set({ theme }),
  toggleTheme: ()        => set((s) => ({ theme: s.theme === 'light' ? 'dark' : 'light' })),
}));
