export type SettingsCategory = 'general' | 'playlists' | 'about';

export interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export interface SettingsSidebarProps {
  selectedCategory: SettingsCategory;
  onSelectCategory: (category: SettingsCategory) => void;
}
