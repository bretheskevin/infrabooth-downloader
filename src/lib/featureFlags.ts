import rawFeatureFlags from '@/config/feature-flags.toml?raw';

export type FeatureFlags = {
  rekordbox: boolean;
};

const DEFAULTS: FeatureFlags = {
  rekordbox: false,
};

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
      throw new Error(`feature-flags.toml: unknown flag "${key}" on line ${index + 1}`);
    }

    if (value !== 'true' && value !== 'false') {
      throw new Error(
        `feature-flags.toml: flag "${key}" must be a boolean (true/false), got "${value}" on line ${index + 1}`,
      );
    }

    flags[key as keyof FeatureFlags] = value === 'true';
  });

  return flags;
}

export const featureFlags: FeatureFlags = parseFeatureFlags(rawFeatureFlags);
