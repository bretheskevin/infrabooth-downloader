import { commands } from '@/bindings';

export type FeatureFlags = Record<string, boolean>;

const DEFAULTS: FeatureFlags = {};

export function parseFeatureFlags(source: string, defaults: FeatureFlags = DEFAULTS): FeatureFlags {
  const flags: FeatureFlags = { ...defaults };
  const knownKeys = new Set(Object.keys(defaults));

  source.split('\n').forEach((rawLine, index) => {
    const line = rawLine.replace(/#.*$/, '').trim();
    if (!line) return;

    const separator = line.indexOf('=');
    if (separator === -1) {
      throw new Error(`feature-flags.toml: invalid line ${index + 1}: "${rawLine}"`);
    }

    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();

    if (!knownKeys.has(key)) {
      return;
    }

    if (value !== 'true' && value !== 'false') {
      throw new Error(`feature-flags.toml: flag "${key}" must be a boolean (true/false), got "${value}" on line ${index + 1}`);
    }

    flags[key as keyof FeatureFlags] = value === 'true';
  });

  return flags;
}

export const featureFlags: FeatureFlags = { ...DEFAULTS };

export async function loadFeatureFlags(): Promise<void> {
  const result = await commands.getFeatureFlags();
  if (result.status === 'ok') {
    Object.assign(featureFlags, parseFeatureFlags(result.data));
  }
}
