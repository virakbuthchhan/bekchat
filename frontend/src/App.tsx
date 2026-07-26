import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from './context/AuthContext';
import { useSocket } from './context/SocketContext';
import { useUserSettings } from './context/UserSettingsContext';
import { AuthPage } from './components/Auth/AuthModal';
import { WorkspaceBar } from './components/Sidebar/WorkspaceBar';
import { ChannelList } from './components/Sidebar/ChannelList';
import { ChatHeader } from './components/Chat/ChatHeader';
import { MessageList } from './components/Chat/MessageList';
import { MessageInput } from './components/Chat/MessageInput';
import { ThreadPanel } from './components/Chat/ThreadPanel';
import { SettingsModal } from './components/Settings/SettingsModal';
import { SearchModal } from './components/Search/SearchModal';
import { ProfileModal } from './components/Profile/ProfileModal';

const MainChatApp: React.FC = () => {
  const { user, token } = useAuth();
  const {
    socket,
    activeTypingUsers,
    joinChannelRoom,
    sendTypingStart,
    sendTypingStop,
    clearTypingUser,
  } = useSocket();
  const { settings, playNotificationSound } = useUserSettings();

  const navigate = useNavigate();
  const location = useLocation();

  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);

  const [channels, setChannels] = useState<any[]>([]);
  const [activeChannel, setActiveChannel] = useState<any | null>(null);

  const [users, setUsers] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);

  const [activeThreadMessage, setActiveThreadMessage] = useState<any | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [showCreateWorkspace, setShowCreateWorkspace] = useState(false);

  // Mobile Drawer State
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);

  // Form states
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelTopic, setNewChannelTopic] = useState('');
  const [newChannelIsPrivate, setNewChannelIsPrivate] = useState(false);
  const [newWsName, setNewWsName] = useState('');
  const [newWsSlug, setNewWsSlug] = useState('');

  useEffect(() => {
    if (user && token) {
      fetchWorkspaces();
      fetchUsers();
    }
  }, [user, token]);

  // Global Keyboard Shortcuts (Cmd+K search, Cmd+/ settings, Cmd+P profile)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;
      if (!isMod) return;

      if (e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShowSearch((prev) => !prev);
      } else if (e.key === '/') {
        e.preventDefault();
        setShowSettings((prev) => !prev);
      } else if (e.key.toLowerCase() === 'p' && !e.shiftKey) {
        e.preventDefault();
        setShowProfile((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // Real-time user status / presence listener
  useEffect(() => {
    if (!socket) return;

    const handlePresenceChange = (data: { userId: string; status: string }) => {
      setUsers((prevUsers) =>
        prevUsers.map((u) => (u.id === data.userId ? { ...u, status: data.status } : u)),
      );
    };

    socket.on('presence:change', handlePresenceChange);
    return () => {
      socket.off('presence:change', handlePresenceChange);
    };
  }, [socket]);

  // Sync workspace and channel from URL location path
  useEffect(() => {
    if (workspaces.length === 0) return;

    const pathParts = location.pathname.split('/').filter(Boolean);
    const wsSlugFromUrl = pathParts[0] === 'w' ? pathParts[1] : null;

    let targetWs = workspaces.find((w) => w.slug === wsSlugFromUrl);
    if (!targetWs) {
      targetWs = workspaces[0];
    }

    if (targetWs && targetWs.id !== activeWorkspaceId) {
      setActiveWorkspaceId(targetWs.id);
    }
  }, [location.pathname, workspaces]);

  useEffect(() => {
    if (activeWorkspaceId) {
      fetchChannels(activeWorkspaceId);
    }
  }, [activeWorkspaceId]);

  // Sync active channel/DM from URL when channels are fetched
  useEffect(() => {
    if (!activeWorkspaceId || channels.length === 0) return;

    const activeWs = workspaces.find((w) => w.id === activeWorkspaceId);
    if (!activeWs) return;

    const pathParts = location.pathname.split('/').filter(Boolean);
    const typeFromUrl = pathParts[2]; // 'c' or 'dm'
    const nameFromUrl = pathParts[3]; // channel name or username

    if (typeFromUrl === 'c' && nameFromUrl) {
      const foundChan = channels.find((c) => c.name === nameFromUrl);
      if (foundChan) {
        setActiveChannel(foundChan);
        return;
      }
    } else if (typeFromUrl === 'dm' && nameFromUrl && users.length > 0) {
      const targetUser = users.find((u) => u.username === nameFromUrl);
      if (targetUser) {
        const foundDm = channels.find((c) =>
          c.type === 'DIRECT_MESSAGE' && c.members?.some((m: any) => m.userId === targetUser.id),
        );
        if (foundDm) {
          setActiveChannel(foundDm);
          return;
        } else {
          handleStartDm(targetUser.id);
          return;
        }
      }
    }

    const defaultChan = channels.find((c) => c.type === 'PUBLIC') || channels[0];
    if (defaultChan) {
      setActiveChannel(defaultChan);
      navigate(`/w/${activeWs.slug}/c/${defaultChan.name}`, { replace: true });
    }
  }, [activeWorkspaceId, channels, location.pathname, users]);

  useEffect(() => {
    if (activeChannel) {
      joinChannelRoom(activeChannel.id);
      fetchMessages(activeChannel.id);
    }
  }, [activeChannel?.id]);

  // Real-time socket listeners for active channel
  useEffect(() => {
    if (!socket || !activeChannel) return;

    const handleNewMessage = (newMsg: any) => {
      if (newMsg.sender?.username) {
        clearTypingUser(newMsg.channelId, newMsg.sender.username);
      }

      if (newMsg.senderId && newMsg.senderId !== user?.id) {
        const isDm = newMsg.channel?.type === 'DIRECT_MESSAGE' || activeChannel.type === 'DIRECT_MESSAGE';
        const allowNotify = isDm ? settings.notifyPrivateChat : settings.notifyChannel;

        if (allowNotify) {
          playNotificationSound();

          if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            if (document.hidden || !document.hasFocus() || activeChannel?.id !== newMsg.channelId) {
              const senderName = newMsg.sender?.username || 'User';
              const title = isDm
                ? `💬 Message from @${senderName}`
                : `📢 #${activeChannel?.name || 'channel'} - @${senderName}`;

              try {
                const notif = new Notification(title, {
                  body: newMsg.content?.substring(0, 120),
                  icon: newMsg.sender?.avatarUrl || 'https://api.dicebear.com/7.x/bottts/svg?seed=BekChat',
                  tag: newMsg.id,
                });

                notif.onclick = () => {
                  window.focus();
                };
              } catch (err) {}
            }
          }
        }
      }

      if (newMsg.channelId === activeChannel.id && !newMsg.parentId) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
      }
    };

    const handleUpdateMessage = (updatedMsg: any) => {
      setMessages((prev) => prev.map((m) => (m.id === updatedMsg.id ? updatedMsg : m)));
    };

    const handleDeleteMessage = (data: { channelId: string; messageId: string }) => {
      setMessages((prev) => prev.filter((m) => m.id !== data.messageId));
    };

    const handleReactionChange = () => {
      if (activeChannel) fetchMessages(activeChannel.id);
    };

    socket.on('message:new', handleNewMessage);
    socket.on('message:update', handleUpdateMessage);
    socket.on('message:delete', handleDeleteMessage);
    socket.on('reaction:change', handleReactionChange);

    return () => {
      socket.off('message:new', handleNewMessage);
      socket.off('message:update', handleUpdateMessage);
      socket.off('message:delete', handleDeleteMessage);
      socket.off('reaction:change', handleReactionChange);
    };
  }, [socket, activeChannel, user?.id, settings]);

  const fetchWorkspaces = async () => {
    try {
      const res = await axios.get('/api/workspaces');
      setWorkspaces(res.data);
    } catch (e) {}
  };

  const fetchUsers = async () => {
    try {
      const res = await axios.get('/api/users');
      setUsers(res.data);
    } catch (e) {}
  };

  const fetchChannels = async (wsId: string) => {
    try {
      const res = await axios.get(`/api/channels?workspaceId=${wsId}`);
      setChannels(res.data);
    } catch (e) {}
  };

  const fetchMessages = async (channelId: string) => {
    try {
      const res = await axios.get(`/api/messages?channelId=${channelId}`);
      setMessages(res.data.messages || []);
    } catch (e) {}
  };

  const handleSelectWorkspace = (wsId: string) => {
    const ws = workspaces.find((w) => w.id === wsId);
    if (ws) {
      setActiveWorkspaceId(ws.id);
      navigate(`/w/${ws.slug}`);
    }
  };

  const handleSelectChannel = (ch: any) => {
    const activeWs = workspaces.find((w) => w.id === activeWorkspaceId);
    if (!activeWs) return;

    setActiveChannel(ch);
    setActiveThreadMessage(null);

    if (ch.type === 'DIRECT_MESSAGE') {
      const otherMember = ch.members?.find((m: any) => m.userId !== user?.id);
      if (otherMember?.user?.username) {
        navigate(`/w/${activeWs.slug}/dm/${otherMember.user.username}`);
        return;
      }
    }

    navigate(`/w/${activeWs.slug}/c/${ch.name}`);
  };

  const handleStartDm = async (targetUserId: string) => {
    if (!activeWorkspaceId) return;
    const activeWs = workspaces.find((w) => w.id === activeWorkspaceId);
    const targetUser = users.find((u) => u.id === targetUserId);

    try {
      const res = await axios.post('/api/channels/dm', {
        workspaceId: activeWorkspaceId,
        targetUserId,
      });
      setChannels((prev) => {
        if (prev.some((c) => c.id === res.data.id)) return prev;
        return [...prev, res.data];
      });
      setActiveChannel(res.data);
      if (activeWs && targetUser) {
        navigate(`/w/${activeWs.slug}/dm/${targetUser.username}`);
      }
    } catch (e) {}
  };

  const handleSendMessage = async (content: string, attachments?: any[]) => {
    if (!activeChannel) return;
    try {
      const res = await axios.post('/api/messages', {
        channelId: activeChannel.id,
        content,
        attachments,
      });
      setMessages((prev) => {
        if (prev.some((m) => m.id === res.data.id)) return prev;
        return [...prev, res.data];
      });
    } catch (e) {}
  };

  const handleSendThreadReply = async (parentId: string, content: string) => {
    if (!activeChannel) return;
    try {
      await axios.post('/api/messages', {
        channelId: activeChannel.id,
        content,
        parentId,
      });
    } catch (e) {}
  };

  const handleCreateChannelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspaceId || !newChannelName) return;
    const activeWs = workspaces.find((w) => w.id === activeWorkspaceId);

    try {
      const res = await axios.post('/api/channels', {
        workspaceId: activeWorkspaceId,
        name: newChannelName,
        topic: newChannelTopic,
        isPrivate: newChannelIsPrivate,
      });
      setChannels((prev) => [...prev, res.data]);
      setActiveChannel(res.data);
      setShowCreateChannel(false);
      setNewChannelName('');
      setNewChannelTopic('');
      setNewChannelIsPrivate(false);

      if (activeWs) {
        navigate(`/w/${activeWs.slug}/c/${res.data.name}`);
      }
    } catch (e) {}
  };

  const handleCreateWorkspaceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWsName || !newWsSlug) return;
    try {
      const res = await axios.post('/api/workspaces', {
        name: newWsName,
        slug: newWsSlug,
      });
      setWorkspaces((prev) => [...prev, res.data]);
      setActiveWorkspaceId(res.data.id);
      setShowCreateWorkspace(false);
      setNewWsName('');
      setNewWsSlug('');
      navigate(`/w/${res.data.slug}`);
    } catch (e) {}
  };

  const handleToggleReaction = async (messageId: string, emoji: string) => {
    try {
      await axios.post(`/api/messages/${messageId}/reactions`, { emoji });
      if (activeChannel) fetchMessages(activeChannel.id);
    } catch (e) {}
  };

  const handleEditMessage = async (messageId: string, content: string) => {
    try {
      await axios.put(`/api/messages/${messageId}`, { content });
      if (activeChannel) fetchMessages(activeChannel.id);
    } catch (e) {}
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      await axios.delete(`/api/messages/${messageId}`);
      if (activeChannel) fetchMessages(activeChannel.id);
    } catch (e) {}
  };

  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId);

  return (
    <div className="h-screen flex w-full overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Desktop Navigation Sidebar */}
      <div className="hidden md:flex flex-shrink-0">
        <WorkspaceBar
          workspaces={workspaces}
          activeWorkspaceId={activeWorkspaceId}
          onSelectWorkspace={handleSelectWorkspace}
          onCreateWorkspace={() => setShowCreateWorkspace(true)}
        />

        <ChannelList
          workspaceName={activeWorkspace?.name || 'Bek-Chat'}
          channels={channels}
          users={users}
          activeChannelId={activeChannel?.id || null}
          onSelectChannel={handleSelectChannel}
          onCreateChannel={() => setShowCreateChannel(true)}
          onStartDm={handleStartDm}
          onOpenSettings={() => setShowSettings(true)}
          onOpenProfile={() => setShowProfile(true)}
        />
      </div>

      {/* Mobile Navigation Drawer */}
      {showMobileSidebar && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm"
            onClick={() => setShowMobileSidebar(false)}
          />
          <div className="relative z-10 flex h-full shadow-2xl">
            <WorkspaceBar
              workspaces={workspaces}
              activeWorkspaceId={activeWorkspaceId}
              onSelectWorkspace={(id) => {
                handleSelectWorkspace(id);
                setShowMobileSidebar(false);
              }}
              onCreateWorkspace={() => {
                setShowCreateWorkspace(true);
                setShowMobileSidebar(false);
              }}
            />
            <ChannelList
              workspaceName={activeWorkspace?.name || 'Bek-Chat'}
              channels={channels}
              users={users}
              activeChannelId={activeChannel?.id || null}
              onSelectChannel={(ch) => {
                handleSelectChannel(ch);
                setShowMobileSidebar(false);
              }}
              onCreateChannel={() => {
                setShowCreateChannel(true);
                setShowMobileSidebar(false);
              }}
              onStartDm={(uid) => {
                handleStartDm(uid);
                setShowMobileSidebar(false);
              }}
              onOpenSettings={() => {
                setShowSettings(true);
                setShowMobileSidebar(false);
              }}
              onOpenProfile={() => {
                setShowProfile(true);
                setShowMobileSidebar(false);
              }}
            />
          </div>
        </div>
      )}

      {/* Pane 2: Central Chat Area */}
      <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-slate-950 min-w-0">
        {activeChannel ? (
          <>
            <ChatHeader
              channelName={
                activeChannel.type === 'DIRECT_MESSAGE'
                  ? (activeChannel.members?.find((m: any) => m.userId !== user?.id)?.user?.username || activeChannel.name)
                  : activeChannel.name
              }
              isPrivate={activeChannel.isPrivate}
              topic={activeChannel.topic}
              memberCount={activeChannel.members?.length || 1}
              onOpenSearch={() => setShowSearch(true)}
              onToggleThreadView={() => {}}
              onToggleMobileSidebar={() => setShowMobileSidebar(true)}
            />

            <MessageList
              messages={messages}
              activeTypingUsernames={activeTypingUsers[activeChannel.id] || []}
              onOpenThread={(msg) => setActiveThreadMessage(msg)}
              onToggleReaction={handleToggleReaction}
              onEditMessage={handleEditMessage}
              onDeleteMessage={handleDeleteMessage}
            />

            <MessageInput
              channelName={
                activeChannel.type === 'DIRECT_MESSAGE'
                  ? (activeChannel.members?.find((m: any) => m.userId !== user?.id)?.user?.username || activeChannel.name)
                  : activeChannel.name
              }
              onSendMessage={handleSendMessage}
              onTyping={() => sendTypingStart(activeChannel.id)}
              onTypingStop={() => sendTypingStop(activeChannel.id)}
            />
          </>
        ) : (
          <div className="h-full flex items-center justify-center text-slate-400 dark:text-slate-500 text-sm">
            Select or create a channel to start chatting.
          </div>
        )}
      </div>

      {/* Pane 3: Thread Panel */}
      {activeThreadMessage && (
        <ThreadPanel
          parentMessage={activeThreadMessage}
          onClose={() => setActiveThreadMessage(null)}
          onSendReply={handleSendThreadReply}
        />
      )}

      {/* Settings Modal */}
      {showSettings && activeWorkspaceId && (
        <SettingsModal
          workspaceId={activeWorkspaceId}
          channels={channels}
          onClose={() => setShowSettings(false)}
          onOpenProfile={() => setShowProfile(true)}
        />
      )}

      {/* User Profile Modal */}
      {showProfile && (
        <ProfileModal onClose={() => setShowProfile(false)} />
      )}

      {/* Search Modal */}
      {showSearch && activeWorkspaceId && (
        <SearchModal
          workspaceId={activeWorkspaceId}
          onClose={() => setShowSearch(false)}
          onSelectChannel={handleSelectChannel}
        />
      )}

      {/* Create Channel Modal */}
      {showCreateChannel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Create New Channel</h3>
            <form onSubmit={handleCreateChannelSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Channel Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. dev-team"
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Topic</label>
                <input
                  type="text"
                  placeholder="Topic or description"
                  value={newChannelTopic}
                  onChange={(e) => setNewChannelTopic(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="privateCheck"
                  checked={newChannelIsPrivate}
                  onChange={(e) => setNewChannelIsPrivate(e.target.checked)}
                  className="rounded bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-0"
                />
                <label htmlFor="privateCheck" className="text-xs text-slate-700 dark:text-slate-300">
                  Make private (only invited members can view)
                </label>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateChannel(false)}
                  className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs hover:bg-slate-300 dark:hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-500"
                >
                  Create Channel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Workspace Modal */}
      {showCreateWorkspace && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Create New Workspace</h3>
            <form onSubmit={handleCreateWorkspaceSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Workspace Name</label>
                <input
                  type="text"
                  required
                  placeholder="Acme Corp"
                  value={newWsName}
                  onChange={(e) => setNewWsName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">Slug</label>
                <input
                  type="text"
                  required
                  placeholder="acme"
                  value={newWsSlug}
                  onChange={(e) => setNewWsSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateWorkspace(false)}
                  className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs hover:bg-slate-300 dark:hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-500"
                >
                  Create Workspace
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export const App: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-950 text-slate-400">
        Initializing Bek-Chat...
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={!user ? <AuthPage mode="login" /> : <Navigate to="/w/general" replace />}
      />
      <Route
        path="/register"
        element={!user ? <AuthPage mode="register" /> : <Navigate to="/w/general" replace />}
      />
      <Route
        path="/w/*"
        element={user ? <MainChatApp /> : <Navigate to="/login" replace />}
      />
      <Route
        path="*"
        element={<Navigate to={user ? '/w/general' : '/login'} replace />}
      />
    </Routes>
  );
};
