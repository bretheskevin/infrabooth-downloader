import { useCallback } from 'react';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '@/features/settings/store';
import { Monitor, Sun, Moon } from 'lucide-react';

const THEME_OPTIONS = [
  { value: 'system', labelKey: 'settings.themeSystem', Icon: Monitor },
  { value: 'light', labelKey: 'settings.themeLight', Icon: Sun },
  { value: 'dark', labelKey: 'settings.themeDark', Icon: Moon },
] as const;

type ThemeValue = (typeof THEME_OPTIONS)[number]['value'];

function isValidTheme(value: string): value is ThemeValue {
  return THEME_OPTIONS.some((opt) => opt.value === value);
}

export function ThemeSection() {
  const { t } = useTranslation();
  const theme = useSettingsStore((state) => state.theme);
  const setTheme = useSettingsStore((state) => state.setTheme);

  const currentOption = THEME_OPTIONS.find((opt) => opt.value === theme) ?? THEME_OPTIONS[0];

  const handleThemeChange = useCallback((newTheme: string) => {
    if (!isValidTheme(newTheme)) return;

    setTheme(newTheme);

    const announcement = document.createElement('div');
    announcement.setAttribute('role', 'status');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = t('accessibility.themeChanged', {
      theme: t(THEME_OPTIONS.find((opt) => opt.value === newTheme)?.labelKey ?? ''),
    });
    document.body.appendChild(announcement);
    setTimeout(() => announcement.remove(), 1000);
  }, [setTheme, t]);

  return (
    <div className="space-y-3">
      <div>
        <Label htmlFor="theme-select" className="text-base font-medium">
          {t('settings.theme')}
        </Label>
        <p className="text-sm text-muted-foreground">
          {t('settings.themeDescription')}
        </p>
      </div>

      <Select value={theme} onValueChange={handleThemeChange}>
        <SelectTrigger id="theme-select" className="w-[180px]">
          <SelectValue>
            <span className="flex items-center gap-2">
              <currentOption.Icon className="h-4 w-4" />
              {t(currentOption.labelKey)}
            </span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {THEME_OPTIONS.map(({ value, labelKey, Icon }) => (
            <SelectItem key={value} value={value}>
              <span className="flex items-center gap-2">
                <Icon className="h-4 w-4" />
                {t(labelKey)}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
