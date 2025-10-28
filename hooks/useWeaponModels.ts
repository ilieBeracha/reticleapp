import { getWeaponsModelsService } from "@/services/weaponModelsService";
import { WeaponModel } from "@/types/database";
import { useCallback, useEffect, useState } from "react";

/**
 * Direct service hook for simple weapon model fetching.
 *
 * This demonstrates the pattern for read-only reference data fetching.
 * Weapon models are public reference data that don't require organization context.
 *
 * Use this pattern when:
 * - Fetching read-only reference data
 * - Data is relatively static (doesn't change frequently)
 * - Simple list display without complex filtering
 * - Single component usage
 *
 * Use the store pattern (weaponModelsStore) when:
 * - Data needs to be cached across multiple components
 * - Complex filtering or search functionality required
 * - Frequent access from different parts of the app
 * - Need to minimize API calls through caching
 *
 * @returns Weapon models data, loading state, error state, and refetch function
 *
 * @example
 * ```tsx
 * function WeaponSelector() {
 *   const { weaponModels, loading, error } = useWeaponModels();
 *
 *   if (loading) return <LoadingSpinner />;
 *   if (error) return <ErrorMessage error={error} />;
 *
 *   return (
 *     <Picker>
 *       {weaponModels.map(model => (
 *         <Picker.Item key={model.id} label={model.name} value={model.id} />
 *       ))}
 *     </Picker>
 *   );
 * }
 * ```
 */
export function useWeaponModels() {
  const [weaponModels, setWeaponModels] = useState<WeaponModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWeaponModels = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Direct service call - no authentication context needed for public data
      const data = await getWeaponsModelsService();

      setWeaponModels(data);
    } catch (err: any) {
      console.error("Error fetching weapon models:", err);
      setError(err.message || "Failed to fetch weapon models");
      setWeaponModels([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-fetch on mount
  useEffect(() => {
    fetchWeaponModels();
  }, [fetchWeaponModels]);

  return {
    weaponModels,
    loading,
    error,
    refetch: fetchWeaponModels,
  };
}
