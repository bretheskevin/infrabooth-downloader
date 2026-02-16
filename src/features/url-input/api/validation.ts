import { api } from '@/lib/tauri';

export type { ValidationResult } from '@/bindings';

export async function validateUrl(url: string) {
  return api.validateSoundcloudUrl(url);
}
