import { create } from "zustand";

interface BreadcrumbStore {
  monthName: string | null;
  setMonthName: (name: string | null) => void;
}

export const useBreadcrumbStore = create<BreadcrumbStore>((set) => ({
  monthName: null,
  setMonthName: (name) => set({ monthName: name }),
}));