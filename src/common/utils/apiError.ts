import axios from 'axios';

// Central error message extractor — §9 of MOBILE_RN_SETUP_GUIDE
export function getApiErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (axios.isAxiosError(error)) {
    const msg = error.response?.data?.message;
    if (Array.isArray(msg) && msg.length > 0) return String(msg[0]);
    if (typeof msg === 'string' && msg.length > 0) return msg;
    if (error.code === 'ECONNABORTED') return 'Request timed out. Please try again.';
    if (!error.response) return 'Network error. Check your connection and try again.';
    return error.message || fallback;
  }
  if (error instanceof Error) return error.message || fallback;
  return fallback;
}

// Parse backend field-level errors for React Hook Form setError()
// Backend returns: { message: ["email must be an email", ...] }
export function parseFieldErrors(error: unknown): Record<string, string> {
  if (!axios.isAxiosError(error)) return {};
  const msg = error.response?.data?.message;
  if (!Array.isArray(msg)) return {};

  const fields: Record<string, string> = {};
  for (const m of msg as string[]) {
    const parts = m.split(' ');
    if (parts.length > 0) {
      fields[parts[0]] = m;
    }
  }
  return fields;
}
