import {
    createWeaponService,
    deleteWeaponService,
    getWeaponsService,
    type CreateWeaponInput,
    type Weapon,
} from "@/services/weaponsService";
import { create } from "zustand";

interface WeaponsStore {
  weapons: Weapon[];
  loading: boolean;
  error: string | null;

  fetchWeapons: (orgId: string) => Promise<void>;
  createWeapon: (
    input: CreateWeaponInput,
    orgId: string,
    userId: string
  ) => Promise<void>;
  deleteWeapon: (weaponId: string) => Promise<void>;
  resetWeapons: () => void;
}

export const weaponsStore = create<WeaponsStore>((set) => ({
  weapons: [],
  loading: false,
  error: null,

  fetchWeapons: async (orgId: string) => {
    try {
      set({ loading: true, error: null });
      const weapons = await getWeaponsService(orgId);
      set({ weapons, loading: false });
    } catch (err: any) {
      console.error("Error fetching weapons:", err);
      set({ error: err.message, weapons: [], loading: false });
    }
  },

  createWeapon: async (
    input: CreateWeaponInput,
    orgId: string,
    userId: string
  ) => {
    try {
      const newWeapon = await createWeaponService(input, orgId, userId);
      set((state) => ({
        weapons: [newWeapon, ...state.weapons],
      }));
    } catch (err: any) {
      console.error("Error creating weapon:", err);
      throw err;
    }
  },

  deleteWeapon: async (weaponId: string) => {
    try {
      await deleteWeaponService(weaponId);
      set((state) => ({
        weapons: state.weapons.filter((w) => w.id !== weaponId),
      }));
    } catch (err: any) {
      console.error("Error deleting weapon:", err);
      throw err;
    }
  },

  resetWeapons: () => {
    set({ weapons: [], loading: false, error: null });
  },
}));

