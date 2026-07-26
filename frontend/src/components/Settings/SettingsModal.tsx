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
  Bell,
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
  const { settings, updateSetting, playNotificationSound, requestNotificationPermission, notificationPermission } = useUserSettings();
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

  const handleTestOutgoingWebhook = async (id: string) => {
    try {
      const res = await axios.post(`/api/webhooks/outgoing/${id}/test`);
      alert(`Test webhook response (Status ${res.data.statusCode}): ${JSON.stringify(res.data.response || res.data)}`);
      fetchWebhooks();
    } catch (err: any) {
      alert(`Test webhook failed: ${err.message}`);
    }
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
                  {settings.isCustomFont && (
                    <p className="text-[11px] text-emerald-500 font-medium flex items-center gap-1">
                      <Check className="w-3 h-3" /> Active Custom Google Font: "{settings.customFontName}"
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Font Size</label>
                  <select
                    value={settings.fontSize}
                    onChange={(e) => updateSetting('fontSize', e.target.value as any)}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium"
                  >
                    <option value="small">Small (12px)</option>
                    <option value="medium">Medium (14px - Default)</option>
                    <option value="large">Large (16px)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Time Format</label>
                  <select
                    value={settings.timeFormat}
                    onChange={(e) => updateSetting('timeFormat', e.target.value as any)}
                    className="w-full mt-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium"
                  >
                    <option value="12-hour">12-hour (02:30 PM)</option>
                    <option value="24-hour">24-hour (14:30)</option>
                  </select>
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

              {wsSuccessMsg && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs">
                  {wsSuccessMsg}
                </div>
              )}
              {wsErrMsg && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl text-xs">
                  {wsErrMsg}
                </div>
              )}

              {/* Edit Workspace Form */}
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

              {/* Invite Member Form */}
              <form onSubmit={handleInviteMember} className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-500 flex items-center gap-1.5">
                  <UserPlus className="w-4 h-4" /> Invite New Member
                </h4>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Enter email or username (e.g. alex_dev)"
                    value={inviteEmailOrUser}
                    onChange={(e) => setInviteEmailOrUser(e.target.value)}
                    className="flex-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
                  />
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as any)}
                    className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold"
                  >
                    <option value="MEMBER">Member</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                  <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-xs shadow">
                    Invite Member
                  </button>
                </div>
              </form>

              {/* Workspace Member List */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Workspace Members ({wsMembers.length})</h4>
                <div className="border border-slate-200 dark:border-slate-800 rounded-2xl divide-y divide-slate-200 dark:divide-slate-800 max-h-48 overflow-y-auto">
                  {wsMembers.length === 0 ? (
                    <p className="p-3 text-xs text-slate-400 italic">No workspace members loaded.</p>
                  ) : (
                    wsMembers.map((m) => (
                      <div key={m.id} className="p-3 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={m.user?.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${m.user?.username}`}
                            alt={m.user?.username}
                            className="w-7 h-7 rounded-full object-cover"
                          />
                          <div>
                            <p className="font-bold text-slate-900 dark:text-slate-100">@{m.user?.username}</p>
                            <span className="text-[10px] text-slate-400">{m.user?.email}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <select
                            value={m.role}
                            onChange={(e) => handleUpdateMemberRole(m.id, e.target.value as any)}
                            className="px-2 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-[11px] font-semibold"
                          >
                            <option value="MEMBER">Member</option>
                            <option value="ADMIN">Admin</option>
                          </select>
                          {m.userId !== user?.id && (
                            <button
                              onClick={() => handleRemoveMember(m.id)}
                              title="Remove member"
                              className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: API & Webhook Integrations */}
          {activeTab === 'webhooks' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-extrabold tracking-tight">API & Webhook Integrations</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Slack-compatible incoming webhooks & outgoing event webhooks.</p>
              </div>

              {/* Incoming Webhooks Section */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-500 flex items-center gap-1.5">
                  <Webhook className="w-4 h-4" /> Incoming Webhooks (Post to Channel)
                </h4>

                <form onSubmit={handleCreateIncomingWebhook} className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">Webhook Bot Name</label>
                      <input
                        type="text"
                        required
                        placeholder="GitHub Deployment Bot"
                        value={newWhName}
                        onChange={(e) => setNewWhName(e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">Target Channel</label>
                      <select
                        value={newWhChannelId}
                        onChange={(e) => setNewWhChannelId(e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold"
                      >
                        {channels.map((c) => (
                          <option key={c.id} value={c.id}>#{c.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-xs shadow">
                    Create Incoming Webhook
                  </button>
                </form>

                <div className="border border-slate-200 dark:border-slate-800 rounded-2xl divide-y divide-slate-200 dark:divide-slate-800">
                  {incomingWebhooks.length === 0 ? (
                    <p className="p-3 text-xs text-slate-400 italic">No incoming webhooks created yet.</p>
                  ) : (
                    incomingWebhooks.map((wh) => {
                      const fullUrl = `${window.location.origin}/api/webhooks/incoming/${wh.token}`;
                      return (
                        <div key={wh.id} className="p-3 space-y-1.5 text-xs">
                          <div className="flex items-center justify-between font-bold">
                            <span>{wh.name} → #{wh.channel?.name}</span>
                            <button
                              onClick={() => copyToClipboard(fullUrl, wh.id)}
                              className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-mono text-[11px]"
                            >
                              <Copy className="w-3 h-3" />
                              {copiedId === wh.id ? 'Copied!' : 'Copy Webhook URL'}
                            </button>
                          </div>
                          <input
                            type="text"
                            readOnly
                            value={fullUrl}
                            className="w-full px-2.5 py-1.5 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-[11px] font-mono text-slate-600 dark:text-slate-400"
                          />
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Outgoing Webhooks Section */}
              <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-500 flex items-center gap-1.5">
                  <Radio className="w-4 h-4" /> Outgoing Webhooks (Event Dispatcher)
                </h4>

                <form onSubmit={handleCreateOutgoingWebhook} className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">Integration Name</label>
                      <input
                        type="text"
                        required
                        placeholder="Production Event Relay"
                        value={newOutWhName}
                        onChange={(e) => setNewOutWhName(e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">Target Endpoint URL</label>
                      <input
                        type="url"
                        required
                        placeholder="https://api.yourserver.com/webhooks"
                        value={newOutWhUrl}
                        onChange={(e) => setNewOutWhUrl(e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
                      />
                    </div>
                  </div>
                  <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-xs shadow">
                    Add Outgoing Webhook
                  </button>
                </form>

                <div className="border border-slate-200 dark:border-slate-800 rounded-2xl divide-y divide-slate-200 dark:divide-slate-800">
                  {outgoingWebhooks.length === 0 ? (
                    <p className="p-3 text-xs text-slate-400 italic">No outgoing webhooks created yet.</p>
                  ) : (
                    outgoingWebhooks.map((wh) => (
                      <div key={wh.id} className="p-3 space-y-2 text-xs">
                        <div className="flex items-center justify-between font-bold">
                          <span>{wh.name} ({wh.targetUrl})</span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleTestOutgoingWebhook(wh.id)}
                              className="px-2.5 py-1 bg-indigo-500/10 text-indigo-500 rounded-md font-semibold hover:bg-indigo-500/20"
                            >
                              Test Ping
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Notifications & Sound */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-extrabold tracking-tight">Notifications & Sound</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Configure web push alerts, desktop notifications, and audio volume.</p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl">
                  <div>
                    <h4 className="text-xs font-bold">Sound Notification Volume</h4>
                    <p className="text-[11px] text-slate-500">Adjust audio volume level for incoming chat alerts.</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={settings.soundVolume}
                      onChange={(e) => updateSetting('soundVolume', parseFloat(e.target.value))}
                      className="w-32 accent-indigo-600"
                    />
                    <button
                      onClick={playNotificationSound}
                      className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-lg shadow"
                    >
                      Test Sound
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl">
                  <div>
                    <h4 className="text-xs font-bold">Direct Message Notifications</h4>
                    <p className="text-[11px] text-slate-500">Pop up desktop alert when receiving private DMs.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.notifyPrivateChat}
                    onChange={(e) => updateSetting('notifyPrivateChat', e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl">
                  <div>
                    <h4 className="text-xs font-bold">Browser Desktop Notification Permissions</h4>
                    <p className="text-[11px] text-slate-500">Current browser permission state: <span className="font-bold uppercase text-indigo-500">{notificationPermission}</span></p>
                  </div>
                  <button
                    onClick={requestNotificationPermission}
                    className="px-3 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-indigo-600 hover:text-white rounded-xl text-xs font-semibold transition-colors"
                  >
                    Request Permission
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: Language Translate Hub */}
          {activeTab === 'languages' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-extrabold tracking-tight">Crowdsourced Language Translate Hub</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Contribute translation phrases for your language and vote on proposals.</p>
              </div>

              <div className="flex items-center gap-3 p-4 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-2xl">
                <Globe className="w-5 h-5 text-indigo-500" />
                <div className="flex-1">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Active Display Language:</span>
                  <div className="flex gap-2 mt-1">
                    {availablePacks.map((pack) => (
                      <button
                        key={pack.code}
                        onClick={() => changeLanguage(pack.code)}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                          currentPack?.code === pack.code
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <span>{pack.flag}</span>
                        <span>{pack.nativeName}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Key Proposals List */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Key Translation Proposals for {currentPack?.nativeName || 'English'}</h4>
                <div className="border border-slate-200 dark:border-slate-800 rounded-2xl divide-y divide-slate-200 dark:divide-slate-800 max-h-64 overflow-y-auto">
                  {translationKeys.length === 0 ? (
                    <p className="p-3 text-xs text-slate-400 italic">No translation keys found.</p>
                  ) : (
                    translationKeys.map((item) => (
                      <div key={item.id} className="p-3 space-y-2 text-xs">
                        <div className="flex items-center justify-between font-bold">
                          <span className="font-mono text-indigo-500">{item.key}</span>
                          <span className="text-slate-400 font-normal">{item.description}</span>
                        </div>

                        {/* Proposals */}
                        <div className="space-y-1 pl-2 border-l-2 border-slate-200 dark:border-slate-800">
                          {item.proposals?.map((prop: any) => (
                            <div key={prop.id} className="flex items-center justify-between text-[11px]">
                              <span>"{prop.value}" (by @{prop.createdBy?.username || 'User'})</span>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => voteProposal(prop.id, 1)}
                                  className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-md font-bold hover:bg-emerald-500/20"
                                >
                                  ▲ {prop.voteCount || 0}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Submit Proposal */}
                        <div className="flex gap-2 pt-1">
                          <input
                            type="text"
                            placeholder="Suggest new translation..."
                            value={proposalInputs[item.id] || ''}
                            onChange={(e) => setProposalInputs({ ...proposalInputs, [item.id]: e.target.value })}
                            className="flex-1 px-3 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                          />
                          <button
                            onClick={() => {
                              if (proposalInputs[item.id]?.trim()) {
                                submitProposal(item.id, proposalInputs[item.id].trim());
                                setProposalInputs({ ...proposalInputs, [item.id]: '' });
                              }
                            }}
                            className="px-3 py-1 bg-indigo-600 text-white rounded-lg font-semibold text-xs hover:bg-indigo-500"
                          >
                            Submit
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
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
