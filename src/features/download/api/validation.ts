import { invoke } from '@tauri-apps/api/core';
import type { ValidationResult } from '@/features/download/types/url';

export async function validateUrl(url: string): Promise<ValidationResult> {
  return invoke<ValidationResult>('validate_soundcloud_url', { url });
}
