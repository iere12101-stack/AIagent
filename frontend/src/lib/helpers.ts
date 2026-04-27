function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)
}

// Convert snake_case object keys to camelCase for Supabase -> frontend compatibility.
export function toCamelCase<T>(input: T): T {
  if (Array.isArray(input)) {
    return input.map((item) => toCamelCase(item)) as T
  }

  if (isPlainObject(input)) {
    return Object.fromEntries(
      Object.entries(input).map(([key, value]) => [
        key.replace(/_([a-z])/g, (_, char: string) => char.toUpperCase()),
        Array.isArray(value) || isPlainObject(value) ? toCamelCase(value) : value,
      ])
    ) as T
  }

  return input
}

// Convert camelCase object keys to snake_case for frontend -> Supabase compatibility.
export function toSnakeCase<T>(input: T): T {
  if (Array.isArray(input)) {
    return input.map((item) => toSnakeCase(item)) as T
  }

  if (isPlainObject(input)) {
    return Object.fromEntries(
      Object.entries(input).map(([key, value]) => [
        key.replace(/[A-Z]/g, (char) => `_${char.toLowerCase()}`),
        Array.isArray(value) || isPlainObject(value) ? toSnakeCase(value) : value,
      ])
    ) as T
  }

  return input
}
