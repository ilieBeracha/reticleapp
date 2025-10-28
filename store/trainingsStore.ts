import {
  createTrainingService,
  deleteTrainingService,
  getTrainingsService,
  updateTrainingService,
} from "@/services/trainingService";
import {
  CreateTrainingInput,
  Training,
  UpdateTrainingInput,
} from "@/types/database";
import { create } from "zustand";

interface TrainingsStore {
  trainings: Training[];
  loading: boolean;
  error: string | null;

  // Actions
  fetchTrainings: (userId: string, orgId?: string | null) => Promise<void>;
  createTraining: (
    input: CreateTrainingInput,
    userId: string,
    orgId: string
  ) => Promise<Training | null>;
  updateTraining: (
    trainingId: string,
    input: UpdateTrainingInput
  ) => Promise<Training | null>;
  deleteTraining: (trainingId: string) => Promise<void>;
  resetTrainings: () => void;
}

export const trainingsStore = create<TrainingsStore>((set) => ({
  trainings: [],
  loading: false,
  error: null,

  fetchTrainings: async (userId: string, orgId?: string | null) => {
    try {
      set({ loading: true, error: null });

      const trainings = await getTrainingsService(userId, orgId);

      set({ trainings, loading: false });
    } catch (err: any) {
      console.error("Error fetching trainings:", err);
      set({ error: err.message, trainings: [], loading: false });
    }
  },

  createTraining: async (
    input: CreateTrainingInput,
    userId: string,
    orgId: string
  ) => {
    if (!userId || !orgId) {
      throw new Error("Not authenticated or no organization context");
    }

    try {
      const training = await createTrainingService(input, userId, orgId);

      // Add new training to the beginning of the list
      set((state) => ({
        trainings: [training, ...state.trainings],
      }));

      return training;
    } catch (err: any) {
      console.error("Error creating training:", err);
      throw err;
    }
  },

  updateTraining: async (trainingId: string, input: UpdateTrainingInput) => {
    try {
      const training = await updateTrainingService(trainingId, input);

      // Update training in the list
      set((state) => ({
        trainings: state.trainings.map((t) =>
          t.id === trainingId ? training : t
        ),
      }));

      return training;
    } catch (err: any) {
      console.error("Error updating training:", err);
      throw err;
    }
  },

  deleteTraining: async (trainingId: string) => {
    try {
      await deleteTrainingService(trainingId);

      // Remove training from the list
      set((state) => ({
        trainings: state.trainings.filter((t) => t.id !== trainingId),
      }));
    } catch (err: any) {
      console.error("Error deleting training:", err);
      throw err;
    }
  },

  resetTrainings: () => {
    set({ trainings: [], loading: false, error: null });
  },
}));
