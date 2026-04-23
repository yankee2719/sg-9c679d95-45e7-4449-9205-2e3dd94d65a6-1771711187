// src/lib/safeQuery.ts
import { PostgrestError } from "@supabase/supabase-js";

export interface SafeQueryResult<T> {
  data: T | null;
  error: PostgrestError | Error | null;
}

export async function safeQuery<T>(fn: () => Promise<{ data: T | null; error: PostgrestError | null }>): Promise<SafeQueryResult<T>> {
  try {
    const result = await fn();
    return {
      data: result.data ?? null,
      error: result.error ?? null,
    };
  } catch (error: any) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error("Query execution failed"),
    };
  }
}

export default safeQuery;
