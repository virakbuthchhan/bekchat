import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { format } from 'date-fns';
import {
  MessageSquare,
  Edit2,
  Trash2,
  FileText,
  Download,
  ExternalLink,
  Copy,
  Check,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useUserSettings } from '../../context/UserSettingsContext';

interface Attachment {
  id: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
}

interface Reaction {
  id: string;
  emoji: string;
  userId: string;
  user?: { username: string };
}

interface Message {
  id: string;
  channelId: string;
  senderId?: string;
  content: string;
  formatting?: string;
  createdAt: string;
  editedAt?: string;
  isDeleted?: boolean;
  sender?: {
    id: string;
    username: string;
    avatarUrl: string;
  };
  attachments?: Attachment[];
  reactions?: Reaction[];
  _count?: { replies: number };
}

interface MessageListProps {
  messages: Message[];
  activeTypingUsernames: string[];
  onOpenThread: (message: Message) => void;
  onToggleReaction: (messageId: string, emoji: string) => void;
  onEditMessage: (messageId: string, content: string) => void;
  onDeleteMessage: (messageId: string) => void;
}

// Helper to convert @username mentions to markdown badge links
const processMentions = (text: string) => {
  return text.replace(/@([a-zA-Z0-9_-]+)/g, '`@$1`');
};

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  activeTypingUsernames,
  onOpenThread,
  onToggleReaction,
  onEditMessage,
  onDeleteMessage,
}) => {
  const { user } = useAuth();
  const { settings } = useUserSettings();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const EMOJI_OPTIONS = ['👍', '❤️', '🚀', '🎉', '🔥', '👀', '💡'];
  const timePattern = settings.timeFormat === '24-hour' ? 'HH:mm' : 'h:mm a';

  // Auto-scroll to bottom on message list update if autoScrollOnMessage setting is enabled
  useEffect(() => {
    if (settings.autoScrollOnMessage) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, activeTypingUsernames.length, settings.autoScrollOnMessage]);

  const handleStartEdit = (msg: Message) => {
    setEditingId(msg.id);
    setEditContent(msg.content);
  };

  const handleSaveEdit = (msgId: string) => {
    if (editContent.trim()) {
      onEditMessage(msgId, editContent);
    }
    setEditingId(null);
  };

  const copyCodeToClipboard = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeId(id);
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 bg-slate-50 dark:bg-slate-950 font-sans">
      {messages.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 space-y-2 select-none">
          <MessageSquare className="w-12 h-12 stroke-[1.5] text-slate-300 dark:text-slate-600 mb-2" />
          <p className="text-base font-semibold text-slate-700 dark:text-slate-300">No messages in this channel yet</p>
          <p className="text-xs text-slate-500">Be the first to start the conversation!</p>
        </div>
      ) : (
        messages.map((msg) => {
          const isSender = msg.senderId === user?.id;
          const isBot = msg.sender?.username?.startsWith('bot_');
          const isEditing = editingId === msg.id;

          // Group reactions by emoji
          const reactionCounts: Record<string, { count: number; userIds: string[]; hasReacted: boolean }> = {};
          (msg.reactions || []).forEach((r) => {
            if (!reactionCounts[r.emoji]) {
              reactionCounts[r.emoji] = { count: 0, userIds: [], hasReacted: false };
            }
            reactionCounts[r.emoji].count++;
            reactionCounts[r.emoji].userIds.push(r.userId);
            if (r.userId === user?.id) {
              reactionCounts[r.emoji].hasReacted = true;
            }
          });

          return (
            <div
              key={msg.id}
              className={`group relative flex gap-3 items-start max-w-[85%] md:max-w-[78%] ${
                isSender ? 'ml-auto flex-row-reverse' : 'mr-auto'
              }`}
            >
              {/* Sender Avatar */}
              <img
                src={
                  msg.sender?.avatarUrl ||
                  `https://api.dicebear.com/7.x/bottts/svg?seed=${msg.sender?.username || 'user'}`
                }
                alt={msg.sender?.username || 'User'}
                className="w-8 h-8 md:w-9 md:h-9 rounded-full object-cover bg-slate-200 dark:bg-slate-800 flex-shrink-0 mt-0.5 shadow-sm"
              />

              <div className={`flex flex-col min-w-0 ${isSender ? 'items-end' : 'items-start'}`}>
                {/* Header info */}
                <div className={`flex items-center gap-2 mb-1 text-xs select-none ${isSender ? 'flex-row-reverse' : ''}`}>
                  <span className="font-bold text-slate-900 dark:text-slate-100">
                    {isSender ? 'You' : msg.sender?.username || 'Deleted User'}
                  </span>
                  {isBot && (
                    <span className="px-1.5 py-0.5 bg-indigo-100 dark:bg-indigo-600/30 text-indigo-700 dark:text-indigo-300 text-[10px] font-semibold rounded uppercase tracking-wider border border-indigo-200 dark:border-indigo-500/20">
                      BOT
                    </span>
                  )}
                  <span className="text-[11px] text-slate-400 dark:text-slate-500">
                    {format(new Date(msg.createdAt), timePattern)}
                  </span>
                  {msg.editedAt && (
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 italic">(edited)</span>
                  )}
                </div>

                {/* Message Bubble Container */}
                <div
                  className={`relative p-3.5 rounded-2xl shadow-sm text-sm ${
                    isSender
                      ? 'bg-indigo-600 text-white rounded-tr-none'
                      : 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-tl-none'
                  }`}
                >
                  {isEditing ? (
                    <div className="space-y-2 min-w-[220px]">
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="w-full p-2 bg-slate-100 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 text-sm focus:outline-none"
                        rows={2}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSaveEdit(msg.id)}
                          className="px-3 py-1 bg-white text-indigo-600 font-semibold rounded text-xs hover:bg-slate-100"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="px-3 py-1 bg-indigo-700 text-white rounded text-xs hover:bg-indigo-800"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className={`leading-relaxed prose max-w-none text-sm ${
                      isSender ? 'prose-invert text-white' : 'dark:prose-invert text-slate-900 dark:text-slate-100'
                    }`}>
                      <ReactMarkdown
                        components={{
                          a({ href, children }) {
                            return (
                              <a
                                href={href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={
                                  isSender
                                    ? 'text-cyan-200 font-semibold underline hover:text-white transition-colors inline-flex items-center gap-0.5'
                                    : 'text-indigo-600 dark:text-indigo-400 font-semibold underline hover:text-indigo-500 transition-colors inline-flex items-center gap-0.5'
                                }
                              >
                                {children}
                                <ExternalLink className="w-3 h-3 inline ml-0.5" />
                              </a>
                            );
                          },
                          code({ inline, className, children }: any) {
                            const codeString = String(children).replace(/\n$/, '');
                            const match = /language-(\w+)/.exec(className || '');
                            const isMention = codeString.startsWith('@');

                            if (isMention) {
                              return (
                                <span className="px-1.5 py-0.5 rounded-md bg-indigo-500/20 text-indigo-400 font-bold text-xs border border-indigo-500/30 inline-flex items-center gap-0.5">
                                  {codeString}
                                </span>
                              );
                            }

                            if (!inline || codeString.includes('\n')) {
                              return (
                                <div className="my-2 rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden font-mono text-xs shadow-lg text-left">
                                  <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900 border-b border-slate-800 text-[11px] text-slate-400">
                                    <span className="uppercase font-bold text-amber-400">{match ? match[1] : 'code'}</span>
                                    <button
                                      onClick={() => copyCodeToClipboard(codeString, `${msg.id}-${codeString.substring(0, 8)}`)}
                                      className="hover:text-white flex items-center gap-1 text-[11px] font-semibold text-slate-400 transition-colors"
                                    >
                                      {copiedCodeId === `${msg.id}-${codeString.substring(0, 8)}` ? (
                                        <span className="text-emerald-400 flex items-center gap-1"><Check className="w-3 h-3" /> Copied!</span>
                                      ) : (
                                        <span className="flex items-center gap-1"><Copy className="w-3 h-3" /> Copy</span>
                                      )}
                                    </button>
                                  </div>
                                  <pre className="p-3.5 overflow-x-auto text-emerald-400 font-mono leading-relaxed bg-slate-950/90">
                                    <code>{codeString}</code>
                                  </pre>
                                </div>
                              );
                            }

                            return (
                              <code className="px-1.5 py-0.5 rounded-md bg-slate-800 text-amber-300 font-mono text-xs border border-slate-700/80">
                                {children}
                              </code>
                            );
                          },
                          blockquote({ children }) {
                            return (
                              <blockquote className="border-l-4 border-indigo-400 dark:border-indigo-500 pl-3 my-2 italic text-slate-700 dark:text-slate-300">
                                {children}
                              </blockquote>
                            );
                          },
                        }}
                      >
                        {processMentions(msg.content)}
                      </ReactMarkdown>
                    </div>
                  )}

                  {/* Attachments */}
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-2">
                      {msg.attachments.map((att) => (
                        <a
                          key={att.id}
                          href={att.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className={`flex items-center gap-2 p-2 rounded-lg text-xs transition-colors border ${
                            isSender
                              ? 'bg-indigo-700/60 border-indigo-500/40 text-indigo-100 hover:bg-indigo-700'
                              : 'bg-slate-100 dark:bg-slate-900/80 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-200'
                          }`}
                        >
                          <FileText className="w-4 h-4" />
                          <span className="truncate max-w-xs">{att.fileName}</span>
                          <Download className="w-3.5 h-3.5 opacity-70" />
                        </a>
                      ))}
                    </div>
                  )}

                  {/* Action Toolbar on Hover */}
                  <div
                    className={`absolute hidden group-hover:flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-1 shadow-lg z-10 -top-4 ${
                      isSender ? 'right-0' : 'left-0'
                    }`}
                  >
                    {EMOJI_OPTIONS.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => onToggleReaction(msg.id, emoji)}
                        className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-sm transition-transform active:scale-125 text-slate-800 dark:text-slate-200"
                      >
                        {emoji}
                      </button>
                    ))}
                    <div className="w-px h-4 bg-slate-200 dark:bg-slate-800 my-auto mx-0.5" />
                    <button
                      onClick={() => onOpenThread(msg)}
                      title="Reply in thread"
                      className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                    </button>
                    {isSender && (
                      <>
                        <button
                          onClick={() => handleStartEdit(msg)}
                          title="Edit message"
                          className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteMessage(msg.id)}
                          title="Delete message"
                          className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-600 dark:text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Reactions */}
                {Object.keys(reactionCounts).length > 0 && (
                  <div className={`flex flex-wrap gap-1.5 mt-1.5 ${isSender ? 'justify-end' : 'justify-start'}`}>
                    {Object.entries(reactionCounts).map(([emoji, data]) => (
                      <button
                        key={emoji}
                        onClick={() => onToggleReaction(msg.id, emoji)}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-colors border ${
                          data.hasReacted
                            ? 'bg-indigo-100 dark:bg-indigo-600/30 border-indigo-300 dark:border-indigo-500/50 text-indigo-700 dark:text-indigo-300'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        <span>{emoji}</span>
                        <span className="font-semibold text-[11px]">{data.count}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Thread Replies Button */}
                {msg._count && msg._count.replies > 0 && (
                  <button
                    onClick={() => onOpenThread(msg)}
                    className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 font-medium hover:underline"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>{msg._count.replies} {msg._count.replies === 1 ? 'reply' : 'replies'}</span>
                  </button>
                )}
              </div>
            </div>
          );
        })
      )}

      {/* Typing indicator */}
      {activeTypingUsernames.length > 0 && (
        <div className="text-xs text-slate-500 dark:text-slate-400 italic flex items-center gap-2 pt-2 px-2 select-none">
          <div className="flex gap-1">
            <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" />
            <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.2s]" />
            <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:0.4s]" />
          </div>
          <span>{activeTypingUsernames.join(', ')} {activeTypingUsernames.length === 1 ? 'is' : 'are'} typing...</span>
        </div>
      )}

      {/* Anchor element for auto-scrolling to bottom */}
      <div ref={messagesEndRef} />
    </div>
  );
};
