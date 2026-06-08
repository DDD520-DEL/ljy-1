import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { SyncState, SyncStatus } from "@/types";

function generateDeviceId(): string {
  return `dev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

interface SyncStore extends SyncState {
  deviceId: string;
  deviceName: string;
  setStatus: (status: SyncStatus) => void;
  setError: (error: string | null) => void;
  markSyncComplete: (deviceName: string) => void;
  setPendingCount: (count: number) => void;
  reset: () => void;
  setDeviceName: (name: string) => void;
}

const storedDeviceId = localStorage.getItem("sync-device-id");
const deviceId = storedDeviceId || generateDeviceId();
if (!storedDeviceId) {
  localStorage.setItem("sync-device-id", deviceId);
}

const defaultDeviceName = `设备-${navigator.platform?.slice(0, 6) || "unknown"}-${deviceId.slice(-4)}`;

export const useSyncStore = create<SyncStore>()(
  persist(
    (set) => ({
      deviceId,
      deviceName: defaultDeviceName,
      status: "idle",
      lastSyncAt: null,
      lastSyncDevice: null,
      pendingCount: 0,
      error: null,
      setStatus: (status) => set({ status }),
      setError: (error) => set({ error }),
      markSyncComplete: (deviceName) =>
        set({
          status: "success",
          lastSyncAt: Date.now(),
          lastSyncDevice: deviceName,
          pendingCount: 0,
          error: null,
        }),
      setPendingCount: (count) => set({ pendingCount: count }),
      reset: () =>
        set({
          status: "idle",
          error: null,
          pendingCount: 0,
        }),
      setDeviceName: (name) => set({ deviceName: name }),
    }),
    {
      name: "sync-state-storage",
      partialize: (state) => ({
        lastSyncAt: state.lastSyncAt,
        lastSyncDevice: state.lastSyncDevice,
        deviceName: state.deviceName,
      }),
    }
  )
);
