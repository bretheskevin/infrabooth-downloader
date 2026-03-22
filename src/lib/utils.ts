import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function getErrorString(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function getFolderName(path: string): string {
  return path.split(/[/\\]/).filter(Boolean).pop() ?? path;
}
