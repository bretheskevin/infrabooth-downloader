import { platform, version, arch } from '@tauri-apps/plugin-os';

export type IssueType = 'bug' | 'feature';

interface IssueUrlOptions {
  appVersion: string;
  lang: string;
}

const REPO_URL = 'https://github.com/bretheskevin/infrabooth-downloader/issues/new';

const PLATFORM_NAMES: Record<string, string> = {
  macos: 'macOS',
  windows: 'Windows',
  linux: 'Linux',
};

function formatPlatformString(): string {
  const name = PLATFORM_NAMES[platform()] ?? platform();
  return `${name} ${version()} (${arch()})`;
}

export function buildGitHubIssueUrl(type: IssueType, options: IssueUrlOptions): string {
  const lang = options.lang === 'fr' ? 'fr' : 'en';
  const templatePrefix = type === 'bug' ? 'bug_report' : 'feature_request';
  const params = new URLSearchParams();

  params.set('template', `${templatePrefix}_${lang}.yml`);

  if (type === 'bug') {
    params.set('version', options.appVersion);
    params.set('platform', formatPlatformString());
  }

  return `${REPO_URL}?${params.toString()}`;
}
