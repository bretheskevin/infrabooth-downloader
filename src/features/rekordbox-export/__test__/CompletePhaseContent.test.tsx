import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import type { ExportResult } from '@/bindings';
import i18n from '@/lib/i18n';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { CompletePhaseContent } from '../components/phases/CompletePhaseContent';
import { groupByStatus } from '../utils/exportGroups';

function renderComplete(result: ExportResult) {
  render(
    <Dialog open>
      <DialogContent>
        <CompletePhaseContent result={result} groups={groupByStatus(new Map())} onClose={() => {}} />
      </DialogContent>
    </Dialog>,
  );
}

describe('CompletePhaseContent summary', () => {
  beforeEach(async () => {
    await act(async () => {
      await i18n.changeLanguage('en');
    });
  });

  it('should pluralize each count in English', () => {
    renderComplete({ exportedCount: 2, skippedCount: 0, playlistName: 'My Playlist', errors: ['Track C: download failed'] });

    expect(screen.getByText('2 exported · 0 skipped · 1 error')).toBeInTheDocument();
  });

  it('should pluralize each count in French', async () => {
    await act(async () => {
      await i18n.changeLanguage('fr');
    });

    renderComplete({ exportedCount: 1, skippedCount: 0, playlistName: 'My Playlist', errors: ['a', 'b'] });

    expect(screen.getByText('1 exporté · 0 ignoré · 2 erreurs')).toBeInTheDocument();
  });
});
