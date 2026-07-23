import { create } from "zustand";

interface AppState {
  workspaceId: string;
  scanId: string | null;
  sidebarCollapsed: boolean;
  commandPaletteOpen: boolean;
  notificationsOpen: boolean;
  activeUploadScanId: string | null;
  setScanId: (id: string | null) => void;
  toggleSidebar: () => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setNotificationsOpen: (open: boolean) => void;
  setActiveUploadScanId: (id: string | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  workspaceId: "ws-prod-aws",
  scanId: null, // null = "Latest"
  sidebarCollapsed: false,
  commandPaletteOpen: false,
  notificationsOpen: false,
  activeUploadScanId: null,
  setScanId: (id) => set({ scanId: id }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  setNotificationsOpen: (open) => set({ notificationsOpen: open }),
  setActiveUploadScanId: (id) => set({ activeUploadScanId: id }),
}));
