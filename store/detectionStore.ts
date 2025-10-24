import { create } from "zustand";

interface Detection {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}
interface DetectionStoreState {
  detections: Detection[];
  setDetections: (detections: Detection[]) => void;
}
export const useDetectionStore = create<DetectionStoreState>((set) => ({
  detections: [],
  setDetections: (detections) => set({ detections }),
}));
