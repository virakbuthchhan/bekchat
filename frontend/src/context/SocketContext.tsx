import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  activeTypingUsers: Record<string, string[]>; // channelId -> array of usernames
  userPresence: Record<string, string>; // userId -> status
  joinChannelRoom: (channelId: string) => void;
  leaveChannelRoom: (channelId: string) => void;
  sendTypingStart: (channelId: string) => void;
  sendTypingStop: (channelId: string) => void;
  clearTypingUser: (channelId: string, usernameOrId?: string) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [activeTypingUsers, setActiveTypingUsers] = useState<Record<string, string[]>>({});
  const [userPresence, setUserPresence] = useState<Record<string, string>>({});
  const typingTimeouts = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    if (!token) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    const socketInstance = io('/', {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socketInstance.on('connect', () => {
      setIsConnected(true);
    });

    socketInstance.on('disconnect', () => {
      setIsConnected(false);
    });

    socketInstance.on('presence:change', (data: { userId: string; status: string }) => {
      setUserPresence((prev) => ({ ...prev, [data.userId]: data.status }));
    });

    socketInstance.on('typing:start', (data: { channelId: string; userId: string; username: string }) => {
      if (data.userId === user?.id) return;

      const key = `${data.channelId}:${data.username}`;
      if (typingTimeouts.current[key]) {
        clearTimeout(typingTimeouts.current[key]);
      }

      setActiveTypingUsers((prev) => {
        const current = prev[data.channelId] || [];
        if (!current.includes(data.username)) {
          return { ...prev, [data.channelId]: [...current, data.username] };
        }
        return prev;
      });

      // Auto clear typing after 3.5s timeout if no stop event sent
      typingTimeouts.current[key] = setTimeout(() => {
        removeTypingUser(data.channelId, data.username);
      }, 3500);
    });

    socketInstance.on('typing:stop', (data: { channelId: string; userId: string; username?: string }) => {
      if (data.username) {
        removeTypingUser(data.channelId, data.username);
      } else {
        // Clear all typing for channel if un-named
        setActiveTypingUsers((prev) => ({ ...prev, [data.channelId]: [] }));
      }
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [token, user?.id]);

  const removeTypingUser = (channelId: string, username: string) => {
    setActiveTypingUsers((prev) => {
      const current = prev[channelId] || [];
      return { ...prev, [channelId]: current.filter((u) => u !== username) };
    });
  };

  const clearTypingUser = (channelId: string, usernameOrId?: string) => {
    if (usernameOrId) {
      removeTypingUser(channelId, usernameOrId);
    } else {
      setActiveTypingUsers((prev) => ({ ...prev, [channelId]: [] }));
    }
  };

  const joinChannelRoom = (channelId: string) => {
    if (socket && channelId) {
      socket.emit('join_channel', { channelId });
    }
  };

  const leaveChannelRoom = (channelId: string) => {
    if (socket && channelId) {
      socket.emit('leave_channel', { channelId });
    }
  };

  const sendTypingStart = (channelId: string) => {
    if (socket && channelId && user) {
      socket.emit('typing_start', { channelId, username: user.username });
    }
  };

  const sendTypingStop = (channelId: string) => {
    if (socket && channelId && user) {
      socket.emit('typing_stop', { channelId, username: user.username });
    }
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        activeTypingUsers,
        userPresence,
        joinChannelRoom,
        leaveChannelRoom,
        sendTypingStart,
        sendTypingStop,
        clearTypingUser,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) throw new Error('useSocket must be used within SocketProvider');
  return context;
};
