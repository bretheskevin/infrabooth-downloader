import { t } from '@remote/lib/i18n';
import { getArtworkUrl } from '@/lib/soundcloud';
import type { RemoteSelection } from '../api/selections';

interface Props {
  title: string;
  selections: RemoteSelection[];
  language: string;
  onSelect: (selection: RemoteSelection) => void;
}

export default function SelectionShelf({ title, selections, language, onSelect }: Props) {
  if (selections.length === 0) return null;

  return (
    <div className="space-y-2">
      <h3 className="px-3 text-sm font-semibold text-foreground">{title}</h3>
      <div className="flex gap-3 overflow-x-auto px-3 pb-2">
        {selections.map((sel) => {
          const src = getArtworkUrl(sel.artworkUrl, 200);
          return (
            <button
              key={sel.id}
              type="button"
              onClick={() => onSelect(sel)}
              className="flex-shrink-0 w-36 text-left rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {src ? (
                <img src={src} alt={sel.title} className="w-36 h-36 rounded-lg object-cover" />
              ) : (
                <div className="w-36 h-36 rounded-lg bg-secondary" />
              )}
              <p className="mt-1.5 text-sm font-medium text-foreground truncate">{sel.title}</p>
              <p className="text-xs text-muted-foreground">
                {sel.trackCount} {t('tracks', language)}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
