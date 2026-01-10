/**
 * Instrumentation utilities for service layer
 * 
 * Provides query timing and logging for debugging/monitoring
 */

/**
 * Wraps an async function to log its execution time
 * 
 * @param queryName - Name for logging (e.g., 'sessions.getRecentSessionsWithStats')
 * @param fn - Async function to execute
 * @returns The result of the function
 * 
 * @example
 * ```ts
 * return withQueryTiming('sessions.getById', async () => {
 *   const { data } = await supabase.from('sessions').select('*').eq('id', id);
 *   return data;
 * });
 * ```
 */
export async function withQueryTiming<T>(
  queryName: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = Date.now();
  
  try {
    const result = await fn();
    const duration = Date.now() - start;
    
    // Log query timing in development
    if (__DEV__) {
      console.log(`[query] ${queryName} (${duration}ms)`);
    }
    
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    
    if (__DEV__) {
      console.error(`[query] ${queryName} FAILED (${duration}ms)`, error);
    }
    
    throw error;
  }
}

/**
 * Simple timing decorator for synchronous functions (rarely needed)
 */
export function withTiming<T>(
  operationName: string,
  fn: () => T
): T {
  const start = Date.now();
  
  try {
    const result = fn();
    const duration = Date.now() - start;
    
    if (__DEV__) {
      console.log(`[op] ${operationName} (${duration}ms)`);
    }
    
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    
    if (__DEV__) {
      console.error(`[op] ${operationName} FAILED (${duration}ms)`, error);
    }
    
    throw error;
  }
}
