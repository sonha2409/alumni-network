/**
 * Discriminated union for Server Action return values.
 * All Server Actions should return this type.
 */
export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };
