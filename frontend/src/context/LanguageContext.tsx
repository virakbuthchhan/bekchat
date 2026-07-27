import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

export interface LanguagePackInfo {
  id: string;
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  isOfficial: boolean;
  createdBy?: string;
  keyCount?: number;
  upvotes?: number;
  downvotes?: number;
  score?: number;
  userVote?: number;
}

export interface TranslationProposalInfo {
  id: string;
  value: string;
  createdBy?: any;
  voteCount?: number;
  userVote?: number;
  createdAt?: string;
}

export interface TranslationKeyInfo {
  id: string;
  key: string;
  description?: string;
  proposals: TranslationProposalInfo[];
}

const DEFAULT_DICTIONARIES: Record<string, Record<string, string>> = {
  en: {
    greeting: 'Hello & Welcome',
    'common.channels': 'Channels',
    'common.direct_messages': 'Direct Messages',
    'common.send': 'Send',
    'common.cancel': 'Cancel',
    'common.save': 'Save',
    'common.delete': 'Delete',
    'common.close': 'Close',
    'common.search': 'Search...',
    'common.loading': 'Loading...',
    'common.confirm': 'Confirm',
    'common.yes': 'Yes',
    'common.no': 'No',
    'common.settings': 'Settings',
    'common.typing': 'is typing...',
    'common.you': 'You',
    'common.members': 'members',
    'common.online': 'Online',
    'common.offline': 'Offline',
    'common.create_channel': 'Create Channel',
    'common.create_workspace': 'Create Workspace',
    'common.edit': 'Edit',
    'common.reply': 'Reply',
    'common.copy': 'Copy',
    'common.copied': 'Copied',
    'common.download': 'Download',
    'common.open_in_tab': 'Open in New Tab',
    'chat.no_messages': 'No messages in this channel yet',
    'chat.start_conversation': 'Be the first to start the conversation!',
    'chat.placeholder': 'Message',
    'chat.voice_message': 'Voice Message',
    'chat.recording': 'Recording',
    'chat.send_voice_note': 'Send Voice Note',
    'chat.voice_preview': 'Voice Note Preview',
    'chat.discard_voice': 'Discard voice message',
    'chat.drop_files_hint': 'Drop files to attach to message',
    'chat.replying_to': 'Replying to',
    'chat.delete_title': 'Delete Message?',
    'chat.delete_confirm': 'Are you sure you want to delete this message? This action cannot be undone.',
    'chat.delete_btn': 'Delete Message',
    'chat.view_photo': 'View Photo',
    'chat.pdf_preview': 'PDF Preview',
    'chat.video_player': 'Video Player',
    'chat.speed': 'Speed',
    'chat.page': 'Page',
    'chat.of': 'of',
    'sidebar.channels': 'Channels',
    'sidebar.direct_messages': 'Direct Messages',
    'sidebar.add_channel': 'Add Channel',
    'sidebar.create_channel': 'Create Channel',
    'sidebar.channel_name': 'Channel Name',
    'sidebar.public': 'Public',
    'sidebar.private': 'Private',
    'sidebar.workspaces': 'Workspaces',
    'sidebar.settings': 'Settings',
    'sidebar.profile': 'Profile',
    'sidebar.logout': 'Sign Out',
    'sidebar.invite_members': 'Invite Members',
    'settings.title': 'Settings',
    'settings.profile': 'Profile',
    'settings.notifications': 'Notifications',
    'settings.appearance': 'Appearance',
    'settings.language': 'Language',
    'settings.security': 'Security',
    'settings.theme': 'Theme',
    'settings.dark': 'Dark',
    'settings.light': 'Light',
    'settings.system': 'System',
    'settings.time_format': 'Time Format',
    'settings.12_hour': '12-hour (1:30 PM)',
    'settings.24_hour': '24-hour (13:30)',
    'settings.auto_scroll': 'Auto-scroll on new messages',
    'settings.sound_effects': 'Notification Sound Effects',
    'settings.save_changes': 'Save Changes',
    'auth.sign_in': 'Sign In',
    'auth.register': 'Register',
    'auth.email': 'Email Address',
    'auth.username': 'Username',
    'auth.password': 'Password',
    'auth.sign_in_welcome': 'Welcome back to Bek-Chat',
    'auth.dont_have_account': "Don't have an account?",
    'auth.already_have_account': 'Already have an account?',
  },
  km: {
    greeting: 'ជម្រាបសួរ',
    'common.channels': 'បណ្តាញ',
    'common.direct_messages': 'សារផ្ទាល់',
    'common.send': 'ផ្ញើ',
    'common.cancel': 'បោះបង់',
    'common.save': 'រក្សាទុក',
    'common.delete': 'លុប',
    'common.close': 'បិទ',
    'common.search': 'ស្វែងរក...',
    'common.loading': 'កំពុងផ្ទុក...',
    'common.confirm': 'បញ្ជាក់',
    'common.yes': 'បាទ/ចាស',
    'common.no': 'ទេ',
    'common.settings': 'ការកំណត់',
    'common.typing': 'កំពុងវាយ...',
    'common.you': 'អ្នក',
    'common.members': 'សមាជិក',
    'common.online': 'អនឡាញ',
    'common.offline': 'អូហ្វឡាញ',
    'common.create_channel': 'បង្កើតបណ្តាញថ្មី',
    'common.create_workspace': 'បង្កើតលំហការងារថ្មី',
    'common.edit': 'កែសម្រួល',
    'common.reply': 'ឆ្លើយតប',
    'common.copy': 'ចម្លង',
    'common.copied': 'បានចម្លង',
    'common.download': 'ទាញយក',
    'common.open_in_tab': 'បើកក្នុងផ្ទាំងថ្មី',
    'chat.no_messages': 'មិនទាន់មានសារនៅក្នុងបណ្តាញនេះទេ',
    'chat.start_conversation': 'ធ្វើជាអ្នកដំបូងដើម្បីចាប់ផ្តើមការសន្ទនា!',
    'chat.placeholder': 'ផ្ញើសារក្នុង',
    'chat.voice_message': 'សារសំឡេង',
    'chat.recording': 'កំពុងថត',
    'chat.send_voice_note': 'ផ្ញើសារសំឡេង',
    'chat.voice_preview': 'ស្ដាប់សារសំឡេង',
    'chat.discard_voice': 'បោះបង់សារសំឡេង',
    'chat.drop_files_hint': 'ទម្លាក់ឯកសារនៅទីនេះដើម្បីផ្ញើ',
    'chat.replying_to': 'កំពុងឆ្លើយតបទៅ',
    'chat.delete_title': 'លុបសារនេះ?',
    'chat.delete_confirm': 'តើអ្នកពិតជាចង់លុបសារនេះមែនទេ? ការសកម្មភាពនេះមិនអាចត្រឡប់វិញបានទេ។',
    'chat.delete_btn': 'លុបសារ',
    'chat.view_photo': 'មើលរូបភាព',
    'chat.pdf_preview': 'មើលឯកសារ PDF',
    'chat.video_player': 'កែវវីដេអូ',
    'chat.speed': 'ល្បឿន',
    'chat.page': 'ទំព័រ',
    'chat.of': 'នៃ',
    'sidebar.channels': 'បណ្តាញ',
    'sidebar.direct_messages': 'សារផ្ទាល់',
    'sidebar.add_channel': 'បន្ថែមបណ្តាញ',
    'sidebar.create_channel': 'បង្កើតបណ្តាញ',
    'sidebar.channel_name': 'ឈ្មោះបណ្តាញ',
    'sidebar.public': 'សាធារណៈ',
    'sidebar.private': 'ឯកជន',
    'sidebar.workspaces': 'លំហការងារ',
    'sidebar.settings': 'ការកំណត់',
    'sidebar.profile': 'ព័ត៌មានរូប',
    'sidebar.logout': 'ចាកចេញ',
    'sidebar.invite_members': 'អញ្ជើញសមាជិក',
    'settings.title': 'ការកំណត់',
    'settings.profile': 'ប្រវត្តិរូប',
    'settings.notifications': 'ការជូនដំណឹង',
    'settings.appearance': 'រូបរាង',
    'settings.language': 'ភាសា',
    'settings.security': 'សុវត្ថិភាព',
    'settings.theme': 'ប្រធានបទ',
    'settings.dark': 'ពណ៌ងងឹត',
    'settings.light': 'ពណ៌ភ្លឺ',
    'settings.system': 'តាមប្រព័ន្ធ',
    'settings.time_format': 'ទម្រង់ម៉ោង',
    'settings.12_hour': '១២ ម៉ោង (1:30 PM)',
    'settings.24_hour': '២៤ ម៉ោង (13:30)',
    'settings.auto_scroll': 'រំកិលចុះក្រោមស្វ័យប្រវត្តិពេលមានសារថ្មី',
    'settings.sound_effects': 'សំឡេងជូនដំណឹង',
    'settings.save_changes': 'រក្សាទុកការផ្លាស់ប្តូរ',
    'auth.sign_in': 'ចូលគណនី',
    'auth.register': 'ចុះឈ្មោះ',
    'auth.email': 'អាសយដ្ឋានអ៊ីមែល',
    'auth.username': 'ឈ្មោះអ្នកប្រើប្រាស់',
    'auth.password': 'ពាក្យសម្ងាត់',
    'auth.sign_in_welcome': 'សូមស្វាគមន៍មកកាន់ Bek-Chat',
    'auth.dont_have_account': 'មិនទាន់មានគណនីមែនទេ?',
    'auth.already_have_account': 'មានគណនីរួចហើយមែនទេ?',
  },
};

interface LanguageContextType {
  currentLanguage: string;
  currentPack: LanguagePackInfo | undefined;
  availablePacks: LanguagePackInfo[];
  translationKeys: TranslationKeyInfo[];
  setLanguage: (code: string) => void;
  changeLanguage: (code: string) => void;
  t: (key: string, fallback?: string) => string;
  fetchLanguagePacks: () => Promise<void>;
  submitProposal: (keyId: string, value: string) => Promise<void>;
  voteProposal: (proposalId: string, vote: number) => Promise<void>;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentLanguage, setCurrentLanguageState] = useState<string>(
    localStorage.getItem('bek_lang') || 'en',
  );
  const [availablePacks, setAvailablePacks] = useState<LanguagePackInfo[]>([
    {
      id: 'en_default',
      code: 'en',
      name: 'English',
      nativeName: 'English',
      flag: '🇺🇸',
      isOfficial: true,
    },
    {
      id: 'km_default',
      code: 'km',
      name: 'Khmer',
      nativeName: 'ភាសាខ្មែរ',
      flag: '🇰🇭',
      isOfficial: true,
    },
  ]);

  const [translationKeys, setTranslationKeys] = useState<TranslationKeyInfo[]>([]);
  const [activeDictionary, setActiveDictionary] = useState<Record<string, string>>(
    DEFAULT_DICTIONARIES[currentLanguage] || DEFAULT_DICTIONARIES.en,
  );

  useEffect(() => {
    fetchLanguagePacks();
    loadLanguageDictionary(currentLanguage);
    fetchKeyProposals(currentLanguage);
  }, []);

  const fetchLanguagePacks = async () => {
    try {
      const res = await axios.get('/api/translations/packs');
      if (Array.isArray(res.data) && res.data.length > 0) {
        setAvailablePacks(res.data);
      }
    } catch (e) {}
  };

  const loadLanguageDictionary = async (code: string) => {
    if (DEFAULT_DICTIONARIES[code]) {
      setActiveDictionary(DEFAULT_DICTIONARIES[code]);
    }
    try {
      const res = await axios.get(`/api/translations/packs/${code}`);
      if (res.data?.dictionary) {
        setActiveDictionary({
          ...(DEFAULT_DICTIONARIES.en || {}),
          ...(DEFAULT_DICTIONARIES[code] || {}),
          ...res.data.dictionary,
        });
      }
    } catch (e) {}
  };

  const fetchKeyProposals = async (code: string) => {
    try {
      const res = await axios.get(`/api/translations/packs/${code}/keys`);
      setTranslationKeys(res.data || []);
    } catch (e) {
      setTranslationKeys([]);
    }
  };

  const setLanguage = (code: string) => {
    setCurrentLanguageState(code);
    localStorage.setItem('bek_lang', code);
    loadLanguageDictionary(code);
    fetchKeyProposals(code);
  };

  const t = (key: string, fallback?: string): string => {
    if (activeDictionary[key]) {
      return activeDictionary[key];
    }
    if (DEFAULT_DICTIONARIES.en[key]) {
      return DEFAULT_DICTIONARIES.en[key];
    }
    return fallback || key;
  };

  const submitProposal = async (keyId: string, value: string) => {
    try {
      await axios.post(`/api/translations/keys/${keyId}/proposals`, { value });
      await loadLanguageDictionary(currentLanguage);
      await fetchKeyProposals(currentLanguage);
    } catch (e) {}
  };

  const voteProposal = async (proposalId: string, vote: number) => {
    try {
      await axios.post(`/api/translations/proposals/${proposalId}/vote`, { vote });
      await loadLanguageDictionary(currentLanguage);
      await fetchKeyProposals(currentLanguage);
    } catch (e) {}
  };

  const currentPack = availablePacks.find((p) => p.code === currentLanguage);

  return (
    <LanguageContext.Provider
      value={{
        currentLanguage,
        currentPack,
        availablePacks,
        translationKeys,
        setLanguage,
        changeLanguage: setLanguage,
        t,
        fetchLanguagePacks,
        submitProposal,
        voteProposal,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
};
