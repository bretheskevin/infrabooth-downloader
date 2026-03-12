import { useTranslation } from 'react-i18next';
import type { ChangelogSection } from '../utils/parseChangelog';

const CATEGORY_STYLES: Record<ChangelogSection['category'], string> = {
  added: 'border-l-primary bg-primary/5',
  changed: 'border-l-green-500 bg-green-500/5',
  fixed: 'border-l-amber-500 bg-amber-500/5',
  removed: 'border-l-red-500 bg-red-500/5',
};

const CATEGORY_LABEL_STYLES: Record<ChangelogSection['category'], string> = {
  added: 'text-primary',
  changed: 'text-green-600 dark:text-green-400',
  fixed: 'text-amber-600 dark:text-amber-400',
  removed: 'text-red-600 dark:text-red-400',
};

interface ChangelogEntryProps {
  sections: ChangelogSection[];
}

export function ChangelogEntry({ sections }: ChangelogEntryProps) {
  const { t } = useTranslation();

  if (sections.length === 0) return null;

  return (
    <div className="space-y-2">
      {sections.map((section) => (
        <div
          key={section.category}
          className={`border-l-[3px] rounded-r-md px-3 py-2 ${CATEGORY_STYLES[section.category]}`}
        >
          <p className={`text-sm font-semibold ${CATEGORY_LABEL_STYLES[section.category]}`}>
            {t(`changelog.${section.category}`)}
          </p>
          <ul className="mt-1 space-y-0.5 list-disc list-inside">
            {section.items.map((item, i) => (
              <li key={i} className="text-sm text-muted-foreground leading-relaxed">
                {item}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
