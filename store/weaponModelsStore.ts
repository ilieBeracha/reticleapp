import { getWeaponsModelsService } from "@/services/weaponModelsService";
import { WeaponModel } from "@/types/database";
import { create } from "zustand";

interface WeaponModelsStore {
  weaponModels: WeaponModel[];
  loading: boolean;
  error: string | null;

  // Action - simplified without token parameter
  fetchWeaponModels: () => Promise<void>;
}

export const weaponModelsStore = create<WeaponModelsStore>((set) => ({
  weaponModels: [],
  loading: false,
  error: null,

  fetchWeaponModels: async () => {
    try {
      set({ loading: true, error: null });
      const weaponModels = await getWeaponsModelsService();
      set({ weaponModels, loading: false });
    } catch (err: any) {
      console.error("Error fetching weapon models:", err);
      set({ error: err.message, weaponModels: [], loading: false });
    }
  },
}));
