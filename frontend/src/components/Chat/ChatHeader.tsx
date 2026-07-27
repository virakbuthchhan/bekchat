import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Hash,
  Lock,
  Search,
  Users,
  Bell,
  Check,
  Sparkles,
  MessageSquare,
  X,
  Menu,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useLanguage } from '../../context/LanguageContext';

interface ChatHeaderProps {
  channelName: string;
  isPrivate?: boolean;
  topic?: string;
  memberCount: number;
  onOpenSearch: () => void;
  onToggleThreadView?: () => void;
  onToggleMobileSidebar?: () => void;
  onSelectChannelById?: (channelId: string) => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  channelName,
  isPrivate,
  topic,
  memberCount,
  onOpenSearch,
  onToggleMobileSidebar,
  onSelectChannelById,
}) => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const { t } = useLanguage();

  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotificationDrawer, setShowNotificationDrawer] = useState(false);

  const handleNotificationClick = async (n: any) => {
    if (!n.isRead) {
      try {
        await axios.post(`/api/notifications/${n.id}/read`);
      } catch (e) {}
      setNotifications((prev) =>
        prev.map((item) => (item.id === n.id ? { ...item, isRead: true } : item)),
      );
    }

    if (n.channelId && onSelectChannelById) {
      onSelectChannelById(n.channelId);
    }

    setShowNotificationDrawer(false);
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user]);

  // Real-time socket notification listener
  useEffect(() => {
    if (!socket || !user) return;

    const handleRealtimeNotif = (newNotif: any) => {
      setNotifications((prev) => [newNotif, ...prev]);
    };

    socket.on(`user_notification:${user.id}`, handleRealtimeNotif);
    return () => {
      socket.off(`user_notification:${user.id}`, handleRealtimeNotif);
    };
  }, [socket, user]);

  const fetchNotifications = async () => {
    try {
      const res = await axios.get('/api/notifications');
      setNotifications(res.data || []);
    } catch (e) {}
  };

  const handleMarkAllRead = async () => {
    try {
      await axios.post('/api/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (e) {}
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="h-14 px-4 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md flex items-center justify-between z-20 select-none relative">
      {/* Left Channel Details */}
      <div className="flex items-center gap-2 md:gap-3 min-w-0">
        {onToggleMobileSidebar && (
          <button
            onClick={onToggleMobileSidebar}
            title="Toggle Sidebar Menu"
            className="md:hidden p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex-shrink-0"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <div className="flex items-center gap-1.5 font-bold text-base text-slate-800 dark:text-slate-100 truncate">
          {isPrivate ? (
            <Lock className="w-4 h-4 text-amber-500 flex-shrink-0" />
          ) : (
            <Hash className="w-4.5 h-4.5 text-slate-400 flex-shrink-0" />
          )}
          <span className="truncate">{channelName}</span>
        </div>

        {topic && (
          <div className="hidden lg:flex items-center gap-2 border-l border-slate-200 dark:border-slate-800 pl-3">
            <span className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-sm">
              {topic}
            </span>
          </div>
        )}
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-2">
        {/* Search button with Cmd+K badge */}
        <button
          onClick={onOpenSearch}
          className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-medium transition-colors border border-slate-200 dark:border-slate-700"
        >
          <Search className="w-3.5 h-3.5 text-indigo-500" />
          <span className="hidden sm:inline">{t('common.search', 'Search...')}</span>
          <kbd className="hidden md:inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-300 text-[10px] font-mono rounded font-semibold border border-slate-300 dark:border-slate-600">
            ⌘K
          </kbd>
        </button>

        {/* Member count pill */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-medium">
          <Users className="w-3.5 h-3.5" />
          <span>{memberCount}</span>
        </div>

        {/* Notification Bell Button Drawer Toggle */}
        <div className="relative">
          <button
            onClick={() => setShowNotificationDrawer(!showNotificationDrawer)}
            title="Notification Center"
            className="relative p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl transition-colors border border-slate-200 dark:border-slate-700"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 px-1.5 py-0.5 bg-indigo-600 text-white font-bold text-[10px] rounded-full animate-pulse shadow-md">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Interactive In-App Notification Drawer */}
          {showNotificationDrawer && (
            <div className="absolute right-0 top-12 w-80 md:w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-4 z-50 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-500" />
                  <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">Notification Center</h3>
                </div>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                    >
                      <Check className="w-3 h-3" />
                      <span>Read All</span>
                    </button>
                  )}
                  <button
                    onClick={() => setShowNotificationDrawer(false)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Notification Items List */}
              <div className="max-h-72 overflow-y-auto space-y-2">
                {notifications.length === 0 ? (
                  <p className="text-xs text-slate-400 italic text-center py-6">No notifications yet.</p>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => handleNotificationClick(n)}
                      className={`p-3 rounded-xl border transition-all text-xs space-y-1 cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-md hover:scale-[1.01] active:scale-98 ${
                        n.isRead
                          ? 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                          : 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-500/40 text-slate-900 dark:text-slate-100 font-medium shadow-sm'
                      }`}
                    >
                      <div className="flex items-center justify-between font-bold">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <MessageSquare className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
                          <span className="truncate">{n.title}</span>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <span className="text-[10px] text-slate-400 font-normal">
                            {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <ExternalLink className="w-3 h-3 text-slate-400" />
                        </div>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">{n.content}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
