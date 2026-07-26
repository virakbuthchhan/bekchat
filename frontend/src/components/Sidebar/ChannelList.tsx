import React, { useState } from 'react';
import {
  Hash,
  Lock,
  Plus,
  Settings,
  LogOut,
  ChevronDown,
  AlertTriangle,
  User,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

interface ChannelListProps {
  workspaceName: string;
  channels: any[];
  users: any[];
  activeChannelId: string | null;
  onSelectChannel: (channel: any) => void;
  onCreateChannel: () => void;
  onStartDm: (targetUserId: string) => void;
  onOpenSettings: () => void;
  onOpenProfile: () => void;
}

export const ChannelList: React.FC<ChannelListProps> = ({
  workspaceName,
  channels,
  users,
  activeChannelId,
  onSelectChannel,
  onCreateChannel,
  onStartDm,
  onOpenSettings,
  onOpenProfile,
}) => {
  const { user, logout } = useAuth();
  const { t } = useLanguage();

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const publicChannels = channels.filter((c) => c.type === 'PUBLIC');
  const privateChannels = channels.filter((c) => c.type === 'PRIVATE');
  const dmChannels = channels.filter((c) => c.type === 'DIRECT_MESSAGE');

  return (
    <div className="w-64 bg-slate-100 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col h-full select-none">
      {/* Workspace Header */}
      <div className="h-14 px-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between font-bold text-slate-800 dark:text-slate-100">
        <div className="flex items-center gap-2 truncate">
          <span className="truncate">{workspaceName}</span>
          <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
        </div>
        <button
          onClick={onOpenSettings}
          title="Workspace & User Settings"
          className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
        >
          <Settings className="w-4.5 h-4.5" />
        </button>
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-6">
        {/* Channels Section */}
        <div>
          <div className="flex items-center justify-between px-2 mb-1">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {t('common.channels', 'Channels')}
            </span>
            <button
              onClick={onCreateChannel}
              title={t('common.create_channel', 'Create Channel')}
              className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-0.5">
            {publicChannels.map((ch) => {
              const isActive = ch.id === activeChannelId;
              return (
                <button
                  key={ch.id}
                  onClick={() => onSelectChannel(ch)}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  <Hash className="w-4 h-4 opacity-70 flex-shrink-0" />
                  <span className="truncate">{ch.name}</span>
                </button>
              );
            })}

            {privateChannels.map((ch) => {
              const isActive = ch.id === activeChannelId;
              return (
                <button
                  key={ch.id}
                  onClick={() => onSelectChannel(ch)}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  <Lock className="w-3.5 h-3.5 opacity-70 flex-shrink-0 text-amber-500" />
                  <span className="truncate">{ch.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Direct Messages Section */}
        <div>
          <div className="flex items-center justify-between px-2 mb-1">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {t('common.direct_messages', 'Direct Messages')}
            </span>
          </div>

          <div className="space-y-0.5">
            {users
              .filter((u) => u.id !== user?.id)
              .map((u) => {
                const existingDm = dmChannels.find((c) =>
                  c.members?.some((m: any) => m.userId === u.id),
                );
                const isActive = existingDm && existingDm.id === activeChannelId;

                return (
                  <button
                    key={u.id}
                    onClick={() => {
                      if (existingDm) {
                        onSelectChannel(existingDm);
                      } else {
                        onStartDm(u.id);
                      }
                    }}
                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
                    }`}
                  >
                    <div className="relative flex-shrink-0">
                      <img
                        src={u.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${u.username}`}
                        alt={u.username}
                        className="w-4 h-4 rounded-full object-cover"
                      />
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-slate-100 dark:border-slate-900 ${
                          u.status === 'ONLINE' ? 'bg-emerald-500' : 'bg-slate-400'
                        }`}
                      />
                    </div>
                    <span className="truncate">{u.username}</span>
                  </button>
                );
              })}
          </div>
        </div>
      </div>

      {/* User Footer Profile */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-200/50 dark:bg-slate-950/40">
        <button
          onClick={onOpenProfile}
          title="Edit Profile"
          className="flex items-center gap-2.5 min-w-0 flex-1 text-left p-1 rounded-xl hover:bg-slate-300/60 dark:hover:bg-slate-800 transition-colors"
        >
          <div className="relative flex-shrink-0">
            <img
              src={user?.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${user?.username}`}
              alt={user?.username}
              className="w-8 h-8 rounded-full object-cover bg-slate-300 dark:bg-slate-700"
            />
            <span
              className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-slate-100 dark:border-slate-900 ${
                user?.status === 'ONLINE' ? 'bg-emerald-500' : user?.status === 'AWAY' ? 'bg-amber-500' : 'bg-slate-400'
              }`}
            />
          </div>
          <div className="truncate">
            <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate flex items-center gap-1">
              <span>{user?.username}</span>
              <User className="w-3 h-3 text-indigo-500" />
            </p>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate block">
              Edit Profile
            </span>
          </div>
        </button>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowLogoutConfirm(true)}
            title="Sign out"
            className="p-1.5 hover:bg-slate-300 dark:hover:bg-slate-800 rounded-lg text-slate-500 hover:text-rose-600 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 w-full max-w-sm space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Confirm Sign Out</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Are you sure you want to log out of Bek-Chat?</p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-300 dark:hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowLogoutConfirm(false);
                  logout();
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold shadow"
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
