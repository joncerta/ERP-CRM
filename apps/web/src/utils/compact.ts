/**
 * Strips empty-string/undefined/null values from a form payload before
 * sending it to the API. Vue's v-model defaults optional text inputs to
 * '', but the backend DTOs validate optional fields with @IsEmail() etc.
 * that reject '' — omitting the key entirely (rather than sending '')
 * is what "the user left this blank" actually means.
 */
export function compact<T extends object>(obj: T): Partial<T> {
  const result: Partial<T> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== '' && value !== undefined && value !== null) {
      (result as Record<string, unknown>)[key] = value;
    }
  }
  return result;
}
