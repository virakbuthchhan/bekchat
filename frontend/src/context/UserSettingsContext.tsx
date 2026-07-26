import React, { createContext, useContext, useState, useEffect } from 'react';

export type FontSize = 'small' | 'medium' | 'large';
export type ThemeMode = 'light' | 'dark' | 'system';
export type TimeFormat = '12-hour' | '24-hour';

export const FONT_PRESETS = [
  { name: 'Plus Jakarta Sans', font: 'sans-serif' },
  { name: 'Inter', font: 'sans-serif' },
  { name: 'Google Sans', font: 'sans-serif' },
  { name: 'Roboto', font: 'sans-serif' },
  { name: 'Outfit', font: 'sans-serif' },
  { name: 'JetBrains Mono', font: 'monospace' },
  { name: 'Kantumruy Pro', font: 'sans-serif' },
];

export interface AccentColorPreset {
  id: string;
  name: string;
  hex: string;
  bgClass: string;
  borderClass: string;
  textClass: string;
}

export const ACCENT_COLOR_PRESETS: AccentColorPreset[] = [
  { id: 'indigo', name: 'Indigo Crystal', hex: '#6366f1', bgClass: 'bg-indigo-600', borderClass: 'border-indigo-600', textClass: 'text-indigo-600 dark:text-indigo-400' },
  { id: 'violet', name: 'Royal Violet', hex: '#8b5cf6', bgClass: 'bg-violet-600', borderClass: 'border-violet-600', textClass: 'text-violet-600 dark:text-violet-400' },
  { id: 'emerald', name: 'Emerald Forest', hex: '#10b981', bgClass: 'bg-emerald-600', borderClass: 'border-emerald-600', textClass: 'text-emerald-600 dark:text-emerald-400' },
  { id: 'rose', name: 'Rose Petal', hex: '#f43f5e', bgClass: 'bg-rose-600', borderClass: 'border-rose-600', textClass: 'text-rose-600 dark:text-rose-400' },
  { id: 'amber', name: 'Amber Gold', hex: '#f59e0b', bgClass: 'bg-amber-600', borderClass: 'border-amber-600', textClass: 'text-amber-600 dark:text-amber-400' },
  { id: 'cyan', name: 'Ocean Cyan', hex: '#06b6d4', bgClass: 'bg-cyan-600', borderClass: 'border-cyan-600', textClass: 'text-cyan-600 dark:text-cyan-400' },
  { id: 'slate', name: 'Onyx Slate', hex: '#475569', bgClass: 'bg-slate-600', borderClass: 'border-slate-600', textClass: 'text-slate-600 dark:text-slate-400' },
];

export interface UserSettings {
  fontSize: FontSize;
  fontFamily: string; // Standard preset or custom Google Font name
  customFontName: string;
  isCustomFont: boolean;
  theme: ThemeMode;
  accentColor: string; // 'indigo' | 'violet' | 'emerald' | 'rose' | 'amber' | 'cyan' | 'slate'
  timeFormat: TimeFormat;
  autoScrollOnMessage: boolean;
  reduceAnimations: boolean;
  soundEnabled: boolean;
  soundVolume: number; // 0.0 to 1.0
  notifyPrivateChat: boolean;
  notifyChannel: boolean;
  notifyWorkspace: boolean;
  showPresence: boolean;
  sendReadReceipts: boolean;
}

const DEFAULT_SETTINGS: UserSettings = {
  fontSize: 'medium',
  fontFamily: 'Plus Jakarta Sans',
  customFontName: 'Google Sans',
  isCustomFont: false,
  theme: 'dark',
  accentColor: 'indigo',
  timeFormat: '12-hour',
  autoScrollOnMessage: true,
  reduceAnimations: false,
  soundEnabled: true,
  soundVolume: 0.7,
  notifyPrivateChat: true,
  notifyChannel: true,
  notifyWorkspace: true,
  showPresence: true,
  sendReadReceipts: true,
};

interface UserSettingsContextType {
  settings: UserSettings;
  updateSettings: (newSettings: Partial<UserSettings>) => void;
  updateSetting: <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => void;
  playNotificationSound: () => void;
  requestNotificationPermission: () => Promise<NotificationPermission>;
  notificationPermission: NotificationPermission;
}

const UserSettingsContext = createContext<UserSettingsContextType | undefined>(undefined);

export const UserSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<UserSettings>(() => {
    const saved = localStorage.getItem('bek_user_settings');
    if (saved) {
      try {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      } catch (e) {}
    }
    return DEFAULT_SETTINGS;
  });

  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default',
  );

  // Apply Font Size, Google Font Loading, Theme Color, and Motion to root document
  useEffect(() => {
    localStorage.setItem('bek_user_settings', JSON.stringify(settings));

    const root = document.documentElement;

    // 1. Font Size
    root.classList.remove('text-size-small', 'text-size-medium', 'text-size-large');
    root.classList.add(`text-size-${settings.fontSize}`);

    if (settings.fontSize === 'small') {
      root.style.fontSize = '14px';
    } else if (settings.fontSize === 'large') {
      root.style.fontSize = '18px';
    } else {
      root.style.fontSize = '16px';
    }

    // 2. Google Font Dynamic Loading & Application
    const activeFont = settings.isCustomFont ? settings.customFontName || 'Google Sans' : settings.fontFamily;
    
    if (activeFont) {
      const fontSlug = activeFont.trim().replace(/\s+/g, '+');
      const fontUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontSlug)}:wght@300;400;500;600;700&display=swap`;

      let linkElem = document.getElementById('dynamic-google-font') as HTMLLinkElement;
      if (!linkElem) {
        linkElem = document.createElement('link');
        linkElem.id = 'dynamic-google-font';
        linkElem.rel = 'stylesheet';
        document.head.appendChild(linkElem);
      }
      if (linkElem.href !== fontUrl) {
        linkElem.href = fontUrl;
      }
    }

    root.style.fontFamily = `"${activeFont}", sans-serif`;

    // 3. Theme Mode (Light, Dark, System)
    let effectiveDark = settings.theme === 'dark';
    if (settings.theme === 'system') {
      effectiveDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }

    if (effectiveDark) {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
    }

    // 4. Accent Color Attribute
    root.setAttribute('data-accent', settings.accentColor || 'indigo');

    // 5. Motion
    if (settings.reduceAnimations) {
      root.classList.add('reduce-motion');
    } else {
      root.classList.remove('reduce-motion');
    }
  }, [settings]);

  const updateSettings = (newSettings: Partial<UserSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  const updateSetting = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const requestNotificationPermission = async () => {
    if (typeof Notification !== 'undefined') {
      const perm = await Notification.requestPermission();
      setNotificationPermission(perm);
      return perm;
    }
    return 'denied';
  };

  const playNotificationSound = () => {
    if (!settings.soundEnabled || settings.soundVolume <= 0) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15); // A5

      gain.gain.setValueAtTime(settings.soundVolume * 0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + 0.3);
    } catch (e) {}
  };

  return (
    <UserSettingsContext.Provider
      value={{
        settings,
        updateSettings,
        updateSetting,
        playNotificationSound,
        requestNotificationPermission,
        notificationPermission,
      }}
    >
      {children}
    </UserSettingsContext.Provider>
  );
};

export const useUserSettings = () => {
  const context = useContext(UserSettingsContext);
  if (!context) throw new Error('useUserSettings must be used within UserSettingsProvider');
  return context;
};
