import { isAxiosError } from 'axios';

export function getErrorMessage(err: unknown, fallback = 'Ocurrió un error inesperado.'): string {
  if (isAxiosError(err)) {
    const message = err.response?.data?.message;
    if (typeof message === 'string') return message;
    if (Array.isArray(message)) return message.join(', ');
  }
  return fallback;
}
