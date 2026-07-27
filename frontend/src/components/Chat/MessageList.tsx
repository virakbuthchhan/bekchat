import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { format } from 'date-fns';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import {
  MessageSquare,
  Edit2,
  Trash2,
  FileText,
  Download,
  ExternalLink,
  Copy,
  Check,
  SmilePlus,
  Reply,
  Play,
  Pause,
  Video,
  FileCode,
  FileArchive,
  ZoomIn,
  Eye,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useUserSettings } from '../../context/UserSettingsContext';

const formatBytes = (bytes: number, decimals = 1) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

const VoicePlayer: React.FC<{ url: string; isSender?: boolean }> = ({ url, isSender }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio(url);
    audioRef.current = audio;

    audio.onloadedmetadata = () => {
      setDuration(audio.duration || 0);
    };

    audio.ontimeupdate = () => {
      setCurrentTime(audio.currentTime || 0);
    };

    audio.onended = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    return () => {
      audio.pause();
    };
  }, [url]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const formatTime = (sec: number) => {
    if (isNaN(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div
      className={`flex items-center gap-3 p-2.5 rounded-2xl shadow-xs my-1 min-w-[220px] max-w-xs select-none ${
        isSender
          ? 'bg-indigo-700/80 border border-indigo-500/50 text-white'
          : 'bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100'
      }`}
    >
      <button
        onClick={togglePlay}
        className={`p-2.5 rounded-full transition-transform active:scale-95 flex-shrink-0 ${
          isSender
            ? 'bg-white text-indigo-700 hover:bg-indigo-50'
            : 'bg-indigo-600 text-white hover:bg-indigo-500'
        }`}
      >
        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
      </button>

      <div className="flex-1 flex flex-col gap-1 min-w-0">
        <div className="flex items-center justify-between text-[11px] font-mono font-semibold opacity-90">
          <span>Voice Message</span>
          <span>
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>
        {/* Animated Waveform indicator */}
        <div className="flex items-center gap-0.5 h-4 overflow-hidden">
          {[40, 70, 30, 90, 50, 80, 40, 100, 60, 40, 80, 50, 30, 70, 40].map((h, i) => (
            <span
              key={i}
              style={{ height: `${h}%` }}
              className={`w-1 rounded-full transition-all ${
                isPlaying ? 'animate-pulse' : 'opacity-50'
              } ${isSender ? 'bg-indigo-200' : 'bg-indigo-500'}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

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
  parentId?: string;
  parent?: {
    id: string;
    content: string;
    sender?: {
      id?: string;
      username: string;
      avatarUrl?: string;
    };
  };
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
  onReplyMessage?: (message: Message) => void;
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
  onReplyMessage,
  onToggleReaction,
  onEditMessage,
  onDeleteMessage,
}) => {
  const { user } = useAuth();
  const { settings } = useUserSettings();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);
  const [activeReactionPickerMessageId, setActiveReactionPickerMessageId] = useState<string | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<{ url: string; name: string } | null>(null);
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

  const scrollToMessage = (targetId: string) => {
    const el = document.getElementById(`msg-${targetId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedMessageId(targetId);
      setTimeout(() => setHighlightedMessageId(null), 2000);
    }
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
        messages.map((msg, idx) => {
          const isSender = msg.senderId === user?.id;
          const isBot = msg.sender?.username?.startsWith('bot_');
          const isEditing = editingId === msg.id;
          const isPickerActive = activeReactionPickerMessageId === msg.id;
          const popoverVerticalClass = idx < 2 ? 'top-full mt-2' : 'bottom-full mb-2';

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
              id={`msg-${msg.id}`}
              key={msg.id}
              className={`group relative flex gap-3 items-start max-w-[85%] md:max-w-[78%] transition-all duration-300 rounded-2xl p-1 ${
                isPickerActive ? 'z-40' : 'z-0'
              } ${
                highlightedMessageId === msg.id ? 'ring-2 ring-indigo-500 bg-indigo-500/10 dark:bg-indigo-500/20' : ''
              } ${isSender ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
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
                  {/* Telegram Quoted Reply Card */}
                  {msg.parent && (
                    <div
                      onClick={() => scrollToMessage(msg.parent!.id)}
                      className={`mb-2 p-2 rounded-xl cursor-pointer border-l-4 text-xs select-none transition-all ${
                        isSender
                          ? 'bg-indigo-700/60 border-indigo-300 text-indigo-100 hover:bg-indigo-700'
                          : 'bg-slate-100 dark:bg-slate-800/80 border-indigo-500 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="font-bold text-[11px] text-indigo-300 dark:text-indigo-400 mb-0.5 flex items-center gap-1">
                        <Reply className="w-3 h-3 inline" />
                        <span>{msg.parent.sender?.username || 'User'}</span>
                      </div>
                      <div className="truncate text-xs opacity-90 italic">
                        {msg.parent.content}
                      </div>
                    </div>
                  )}
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

                  {/* Rich Attachments (Voice Notes, Photos, Videos, Documents) */}
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="mt-2.5 space-y-2 max-w-full overflow-hidden">
                      {msg.attachments.map((att) => {
                        const isImg = att.mimeType?.startsWith('image/');
                        const isVid = att.mimeType?.startsWith('video/');
                        const isAud = att.mimeType?.startsWith('audio/');
                        const isCode = att.mimeType?.includes('json') || att.mimeType?.includes('javascript') || att.fileName.endsWith('.js') || att.fileName.endsWith('.ts');
                        const isZip = att.mimeType?.includes('zip') || att.mimeType?.includes('tar') || att.fileName.endsWith('.zip');

                        if (isAud) {
                          return <VoicePlayer key={att.id} url={att.fileUrl} isSender={isSender} />;
                        }

                        if (isVid) {
                          return (
                            <div key={att.id} className="my-1 overflow-hidden rounded-2xl border border-slate-700/50 shadow-md">
                              <video
                                src={att.fileUrl}
                                controls
                                className="max-h-80 max-w-full rounded-2xl bg-black"
                              />
                            </div>
                          );
                        }

                        if (isImg) {
                          return (
                            <div
                              key={att.id}
                              onClick={() => setLightboxImage({ url: att.fileUrl, name: att.fileName })}
                              className="group/img relative my-1 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md cursor-pointer max-w-xs md:max-w-md"
                            >
                              <img
                                src={att.fileUrl}
                                alt={att.fileName}
                                className="max-h-72 w-full object-cover transition-transform duration-300 group-hover/img:scale-105"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center text-white gap-2">
                                <ZoomIn className="w-5 h-5" />
                                <span className="text-xs font-semibold">Click to View</span>
                              </div>
                            </div>
                          );
                        }

                        // Document & Generic File Card
                        return (
                          <a
                            key={att.id}
                            href={att.fileUrl}
                            download={att.fileName}
                            target="_blank"
                            rel="noreferrer"
                            className={`flex items-center justify-between gap-3 p-3 rounded-xl text-xs transition-all border my-1 max-w-xs md:max-w-sm ${
                              isSender
                                ? 'bg-indigo-700/60 border-indigo-500/40 text-indigo-100 hover:bg-indigo-700'
                                : 'bg-slate-100 dark:bg-slate-900/80 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              {isCode ? (
                                <FileCode className="w-5 h-5 text-amber-400 flex-shrink-0" />
                              ) : isZip ? (
                                <FileArchive className="w-5 h-5 text-purple-400 flex-shrink-0" />
                              ) : (
                                <FileText className="w-5 h-5 text-indigo-400 flex-shrink-0" />
                              )}
                              <div className="flex flex-col min-w-0">
                                <span className="truncate font-semibold">{att.fileName}</span>
                                <span className="text-[10px] opacity-75 font-mono">
                                  {formatBytes(att.fileSize)}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0 opacity-80 hover:opacity-100">
                              <Download className="w-4 h-4" />
                            </div>
                          </a>
                        );
                      })}
                    </div>
                  )}

                  {/* Full Reaction Picker Popover */}
                  {activeReactionPickerMessageId === msg.id && (
                    <>
                      {/* Transparent backdrop to dismiss reaction picker when clicking outside */}
                      <div
                        className="fixed inset-0 z-40 bg-black/5 dark:bg-black/20"
                        onClick={() => setActiveReactionPickerMessageId(null)}
                      />
                      <div className={`absolute z-50 shadow-2xl rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900 animate-in fade-in zoom-in-95 duration-150 ${
                        isSender ? 'right-0' : 'left-0'
                      } ${popoverVerticalClass}`}>
                        <EmojiPicker
                          theme={Theme.AUTO}
                          onEmojiClick={(emojiData) => {
                            onToggleReaction(msg.id, emojiData.emoji);
                            setActiveReactionPickerMessageId(null);
                          }}
                          lazyLoadEmojis={true}
                          searchPlaceHolder="Search all reaction emojis..."
                          width={window.innerWidth < 480 ? 280 : 320}
                          height={340}
                        />
                      </div>
                    </>
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
                    <button
                      onClick={() => setActiveReactionPickerMessageId(activeReactionPickerMessageId === msg.id ? null : msg.id)}
                      title="More reactions (All internet emojis)..."
                      className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-500 hover:text-indigo-500 transition-colors"
                    >
                      <SmilePlus className="w-3.5 h-3.5" />
                    </button>
                    <div className="w-px h-4 bg-slate-200 dark:bg-slate-800 my-auto mx-0.5" />
                    {onReplyMessage && (
                      <button
                        onClick={() => onReplyMessage(msg)}
                        title="Reply to specific message (Telegram style)"
                        className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                      >
                        <Reply className="w-3.5 h-3.5" />
                      </button>
                    )}
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

      {/* Image Lightbox Modal */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150 select-none"
          onClick={() => setLightboxImage(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] flex flex-col items-center gap-3"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={lightboxImage.url}
              alt={lightboxImage.name}
              className="max-h-[80vh] max-w-full rounded-2xl object-contain shadow-2xl border border-slate-700/60"
            />
            <div className="flex items-center justify-between w-full px-2 text-white text-xs font-semibold">
              <span className="truncate max-w-md">{lightboxImage.name}</span>
              <div className="flex items-center gap-3">
                <a
                  href={lightboxImage.url}
                  download={lightboxImage.name}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl flex items-center gap-1.5 transition-colors shadow"
                >
                  <Download className="w-4 h-4" />
                  <span>Download</span>
                </a>
                <button
                  onClick={() => setLightboxImage(null)}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
