import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  X,
  Palette,
  Volume2,
  Lock,
  Globe,
  Plus,
  Check,
  Building,
  UserPlus,
  Trash2,
  Webhook,
  User,
  Radio,
  Copy,
} from 'lucide-react';
import { useUserSettings, FONT_PRESETS } from '../../context/UserSettingsContext';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';

interface SettingsModalProps {
  workspaceId: string;
  channels: any[];
  onClose: () => void;
  onOpenProfile?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  workspaceId,
  channels,
  onClose,
  onOpenProfile,
}) => {
  const { user } = useAuth();
  const { settings, updateSetting } = useUserSettings();
  const {
    currentPack,
    availablePacks,
    translationKeys,
    changeLanguage,
    submitProposal,
    voteProposal,
  } = useLanguage();

  const [activeTab, setActiveTab] = useState<
    'general' | 'workspace' | 'webhooks' | 'notifications' | 'languages' | 'privacy'
  >('general');

  // Custom Google Font state
  const [customFontInput, setCustomFontInput] = useState(settings.customFontName || '');

  // Workspace Settings state
  const [workspace, setWorkspace] = useState<any>(null);
  const [wsMembers, setWsMembers] = useState<any[]>([]);
  const [wsName, setWsName] = useState('');
  const [wsIconUrl, setWsIconUrl] = useState('');
  const [inviteEmailOrUser, setInviteEmailOrUser] = useState('');
  const [inviteRole, setInviteRole] = useState<'ADMIN' | 'MEMBER'>('MEMBER');
  const [wsSuccessMsg, setWsSuccessMsg] = useState('');
  const [wsErrMsg, setWsErrMsg] = useState('');

  // Webhooks & API state
  const [incomingWebhooks, setIncomingWebhooks] = useState<any[]>([]);
  const [outgoingWebhooks, setOutgoingWebhooks] = useState<any[]>([]);
  const [newWhName, setNewWhName] = useState('');
  const [newWhChannelId, setNewWhChannelId] = useState(channels[0]?.id || '');
  const [newOutWhName, setNewOutWhName] = useState('');
  const [newOutWhUrl, setNewOutWhUrl] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Crowdsourced Translations state
  const [proposalInputs, setProposalInputs] = useState<{ [keyId: string]: string }>({});

  useEffect(() => {
    if (activeTab === 'workspace') {
      fetchWorkspaceDetails();
      fetchWorkspaceMembers();
    } else if (activeTab === 'webhooks') {
      fetchWebhooks();
    }
  }, [activeTab, workspaceId]);

  const fetchWorkspaceDetails = async () => {
    try {
      const res = await axios.get(`/api/workspaces/${workspaceId}`);
      setWorkspace(res.data);
      setWsName(res.data.name || '');
      setWsIconUrl(res.data.iconUrl || '');
    } catch (e) {}
  };

  const fetchWorkspaceMembers = async () => {
    try {
      const res = await axios.get(`/api/workspaces/${workspaceId}/members`);
      setWsMembers(res.data || []);
    } catch (e) {}
  };

  const fetchWebhooks = async () => {
    try {
      const [incRes, outRes] = await Promise.all([
        axios.get(`/api/webhooks/incoming?workspaceId=${workspaceId}`),
        axios.get(`/api/webhooks/outgoing?workspaceId=${workspaceId}`),
      ]);
      setIncomingWebhooks(incRes.data || []);
      setOutgoingWebhooks(outRes.data || []);
    } catch (e) {}
  };

  const handleUpdateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    setWsSuccessMsg('');
    setWsErrMsg('');
    try {
      await axios.put(`/api/workspaces/${workspaceId}`, {
        name: wsName,
        iconUrl: wsIconUrl,
      });
      setWsSuccessMsg('Workspace settings updated successfully!');
      fetchWorkspaceDetails();
    } catch (err: any) {
      setWsErrMsg(err.response?.data?.message || 'Failed to update workspace');
    }
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setWsSuccessMsg('');
    setWsErrMsg('');
    try {
      await axios.post(`/api/workspaces/${workspaceId}/invite`, {
        emailOrUsername: inviteEmailOrUser,
        role: inviteRole,
      });
      setWsSuccessMsg(`Successfully invited @${inviteEmailOrUser} to workspace!`);
      setInviteEmailOrUser('');
      fetchWorkspaceMembers();
    } catch (err: any) {
      setWsErrMsg(err.response?.data?.message || 'Failed to invite member');
    }
  };

  const handleUpdateMemberRole = async (memberId: string, newRole: 'ADMIN' | 'MEMBER') => {
    try {
      await axios.put(`/api/workspaces/${workspaceId}/members/${memberId}`, { role: newRole });
      fetchWorkspaceMembers();
    } catch (e) {}
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this member from the workspace?')) return;
    try {
      await axios.delete(`/api/workspaces/${workspaceId}/members/${memberId}`);
      fetchWorkspaceMembers();
    } catch (e) {}
  };

  const handleCreateIncomingWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWhName || !newWhChannelId) return;
    try {
      await axios.post('/api/webhooks/incoming', {
        name: newWhName,
        channelId: newWhChannelId,
      });
      setNewWhName('');
      fetchWebhooks();
    } catch (e) {}
  };

  const handleCreateOutgoingWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOutWhName || !newOutWhUrl) return;
    try {
      await axios.post('/api/webhooks/outgoing', {
        workspaceId,
        name: newOutWhName,
        targetUrl: newOutWhUrl,
        events: ['message.created', '*'],
      });
      setNewOutWhName('');
      setNewOutWhUrl('');
      fetchWebhooks();
    } catch (e) {}
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleApplyCustomFont = () => {
    if (customFontInput.trim()) {
      updateSetting('customFontName', customFontInput.trim());
      updateSetting('isCustomFont', true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 select-none">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-4xl h-[680px] flex overflow-hidden shadow-2xl">
        {/* Left Sidebar */}
        <div className="w-56 bg-slate-100 dark:bg-slate-950 p-4 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between">
          <div className="space-y-1">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-3 mb-3">
              Settings & Integrations
            </h2>

            <button
              onClick={() => setActiveTab('general')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'general'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              <Palette className="w-4 h-4" />
              General Appearance
            </button>

            <button
              onClick={() => setActiveTab('workspace')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'workspace'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              <Building className="w-4 h-4" />
              Workspace & Members
            </button>

            <button
              onClick={() => setActiveTab('webhooks')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'webhooks'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              <Webhook className="w-4 h-4" />
              API & Webhook Bots
            </button>

            <button
              onClick={() => setActiveTab('notifications')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'notifications'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              <Volume2 className="w-4 h-4" />
              Notifications & Sound
            </button>

            <button
              onClick={() => setActiveTab('languages')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'languages'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              <Globe className="w-4 h-4" />
              Translate Hub (i18n)
            </button>

            <button
              onClick={() => setActiveTab('privacy')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'privacy'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              <Lock className="w-4 h-4" />
              Privacy & Account
            </button>
          </div>

          <button
            onClick={onClose}
            className="w-full py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold rounded-xl text-xs transition-colors flex items-center justify-center gap-2"
          >
            <X className="w-4 h-4" />
            Close Settings
          </button>
        </div>

        {/* Right Content Area */}
        <div className="flex-1 p-6 md:p-8 overflow-y-auto bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
          {/* TAB 1: General Appearance */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-extrabold tracking-tight">General Appearance</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Customize theme, Google Fonts, font size, time format, and chat auto-scroll.</p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Theme Mode</label>
                <div className="grid grid-cols-3 gap-3">
                  {(['dark', 'light', 'system'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => updateSetting('theme', t)}
                      className={`p-3 rounded-2xl border text-xs font-bold capitalize transition-all ${
                        settings.theme === t
                          ? 'border-indigo-600 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shadow'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {t} Mode
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Font Family & Custom Google Fonts</label>
                <div className="flex flex-wrap gap-2">
                  {FONT_PRESETS.map((f) => (
                    <button
                      key={f.name}
                      onClick={() => {
                        updateSetting('fontFamily', f.name);
                        updateSetting('isCustomFont', false);
                      }}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                        !settings.isCustomFont && settings.fontFamily === f.name
                          ? 'border-indigo-600 bg-indigo-600 text-white shadow-md'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {f.name}
                    </button>
                  ))}
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-2">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Custom Google Font Name:</span>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. Poppins, Fira Code, Battambang, Roboto"
                      value={customFontInput}
                      onChange={(e) => setCustomFontInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleApplyCustomFont()}
                      className="flex-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
                    />
                    <button
                      onClick={handleApplyCustomFont}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-xs shadow"
                    >
                      Apply Google Font
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Workspace & Members */}
          {activeTab === 'workspace' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-extrabold tracking-tight">Workspace & Members</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Edit workspace name, icon URL, invite new members, and assign roles.</p>
              </div>

              <form onSubmit={handleUpdateWorkspace} className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-500">Workspace Details</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Workspace Name</label>
                    <input
                      type="text"
                      required
                      value={wsName}
                      onChange={(e) => setWsName(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">Icon Image URL</label>
                    <input
                      type="text"
                      placeholder="https://example.com/logo.png"
                      value={wsIconUrl}
                      onChange={(e) => setWsIconUrl(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
                    />
                  </div>
                </div>
                <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-xs shadow">
                  Save Workspace Info
                </button>
              </form>
            </div>
          )}

          {/* TAB 3: API & Webhook Integrations */}
          {activeTab === 'webhooks' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-extrabold tracking-tight">API & Webhook Integrations</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Slack-compatible incoming webhooks & outgoing event webhooks.</p>
              </div>
            </div>
          )}

          {/* TAB 6: Privacy & Account */}
          {activeTab === 'privacy' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-extrabold tracking-tight">Privacy & Account Settings</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Manage your user profile details, avatar, and security.</p>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
                <div className="flex items-center gap-3">
                  <img
                    src={user?.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${user?.username}`}
                    alt={user?.username}
                    className="w-12 h-12 rounded-full object-cover border-2 border-indigo-600"
                  />
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">@{user?.username}</h4>
                    <p className="text-xs text-slate-500">{user?.email}</p>
                  </div>
                </div>

                {onOpenProfile && (
                  <button
                    onClick={() => {
                      onClose();
                      onOpenProfile();
                    }}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-xs shadow flex items-center justify-center gap-2"
                  >
                    <User className="w-4 h-4" />
                    Edit User Profile & Change Password
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
