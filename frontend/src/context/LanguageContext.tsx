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
    'common.settings': 'Settings',
    'common.search': 'Search messages...',
    'common.typing': 'is typing...',
    'common.you': 'You',
    'common.members': 'members',
    'common.create_channel': 'Create Channel',
    'common.create_workspace': 'Create Workspace',
    'auth.sign_in': 'Sign In',
    'auth.register': 'Register',
  },
  km: {
    greeting: 'ជម្រាបសួរ',
    'common.channels': 'បណ្តាញ',
    'common.direct_messages': 'សារផ្ទាល់',
    'common.send': 'ផ្ញើ',
    'common.cancel': 'បោះបង់',
    'common.save': 'រក្សាទុក',
    'common.settings': 'ការកំណត់',
    'common.search': 'ស្វែងរកសារ...',
    'common.typing': 'កំពុងវាយអក្សរ...',
    'common.you': 'អ្នក',
    'common.members': 'សមាជិក',
    'common.create_channel': 'បង្កើតបណ្តាញថ្មី',
    'common.create_workspace': 'បង្កើតលំហការងារថ្មី',
    'auth.sign_in': 'ចូលគណនី',
    'auth.register': 'ចុះឈ្មោះ',
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
