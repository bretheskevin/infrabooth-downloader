import { describe, it, expect, vi, afterEach } from 'vitest';
import { buildGitHubIssueUrl } from '../github';

vi.mock('@tauri-apps/plugin-os', () => ({
  platform: vi.fn().mockReturnValue('macos'),
  version: vi.fn().mockReturnValue('15.4'),
  arch: vi.fn().mockReturnValue('aarch64'),
}));

const BASE = 'https://github.com/bretheskevin/infrabooth-downloader/issues/new';

describe('buildGitHubIssueUrl', () => {
  afterEach(async () => {
    const os = await import('@tauri-apps/plugin-os');
    vi.mocked(os.platform).mockReturnValue('macos');
    vi.mocked(os.version).mockReturnValue('15.4');
    vi.mocked(os.arch).mockReturnValue('aarch64');
  });

  it('builds English bug report URL with version and platform', () => {
    const url = buildGitHubIssueUrl('bug', { appVersion: '1.21.1', lang: 'en' });
    expect(url).toBe(
      `${BASE}?template=bug_report_en.yml&version=1.21.1&platform=macOS+15.4+%28aarch64%29`
    );
  });

  it('builds French bug report URL with version and platform', () => {
    const url = buildGitHubIssueUrl('bug', { appVersion: '1.21.1', lang: 'fr' });
    expect(url).toBe(
      `${BASE}?template=bug_report_fr.yml&version=1.21.1&platform=macOS+15.4+%28aarch64%29`
    );
  });

  it('builds English feature request URL without version or platform', () => {
    const url = buildGitHubIssueUrl('feature', { appVersion: '1.21.1', lang: 'en' });
    expect(url).toBe(`${BASE}?template=feature_request_en.yml`);
  });

  it('builds French feature request URL without version or platform', () => {
    const url = buildGitHubIssueUrl('feature', { appVersion: '1.21.1', lang: 'fr' });
    expect(url).toBe(`${BASE}?template=feature_request_fr.yml`);
  });

  it('formats Windows platform correctly', async () => {
    const os = await import('@tauri-apps/plugin-os');
    vi.mocked(os.platform).mockReturnValue('windows');
    vi.mocked(os.version).mockReturnValue('10.0.22631');
    vi.mocked(os.arch).mockReturnValue('x86_64');

    const url = buildGitHubIssueUrl('bug', { appVersion: '2.0.0', lang: 'en' });
    expect(url).toBe(
      `${BASE}?template=bug_report_en.yml&version=2.0.0&platform=Windows+10.0.22631+%28x86_64%29`
    );
  });

  it('formats Linux platform correctly', async () => {
    const os = await import('@tauri-apps/plugin-os');
    vi.mocked(os.platform).mockReturnValue('linux');
    vi.mocked(os.version).mockReturnValue('6.5.0');
    vi.mocked(os.arch).mockReturnValue('x86_64');

    const url = buildGitHubIssueUrl('bug', { appVersion: '1.0.0', lang: 'en' });
    expect(url).toBe(
      `${BASE}?template=bug_report_en.yml&version=1.0.0&platform=Linux+6.5.0+%28x86_64%29`
    );
  });

  it('defaults to en template for unknown language', () => {
    const url = buildGitHubIssueUrl('bug', { appVersion: '1.0.0', lang: 'de' });
    expect(url).toBe(
      `${BASE}?template=bug_report_en.yml&version=1.0.0&platform=macOS+15.4+%28aarch64%29`
    );
  });
});
