import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Link,
  List,
  ListOrdered,
  Quote,
  Code,
  SquareCode,
  Plus,
  Type,
  Smile,
  AtSign,
  Video,
  Mic,
  FileCode,
  Send,
  ChevronDown,
  Paperclip,
  X,
  Reply,
} from 'lucide-react';

interface MessageInputProps {
  channelName: string;
  onSendMessage: (content: string, attachments?: any[], parentId?: string) => void;
  onTyping?: () => void;
  onTypingStop?: () => void;
  replyingToMessage?: any | null;
  onCancelReply?: () => void;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  channelName,
  onSendMessage,
  onTyping,
  onTypingStop,
  replyingToMessage,
  onCancelReply,
}) => {
  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState<any[]>([]);
  const [showFormatting, setShowFormatting] = useState(true);

  // Popovers state
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<any>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showEmojiPicker]);

  // Auto-focus textarea when replyingToMessage changes
  useEffect(() => {
    if (replyingToMessage && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [replyingToMessage]);

  // Auto-resize textarea height as content changes
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 240)}px`;
    }
  }, [content]);

  const fetchUsers = async () => {
    try {
      const res = await axios.get('/api/users');
      setUsers(res.data || []);
    } catch (e) {}
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setContent(val);

    if (onTyping) {
      onTyping();
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        if (onTypingStop) onTypingStop();
      }, 2500);
    }

    // Mention trigger check
    const cursor = e.target.selectionStart;
    const textBeforeCursor = val.substring(0, cursor);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex !== -1 && (lastAtIndex === 0 || textBeforeCursor[lastAtIndex - 1] === ' ')) {
      const query = textBeforeCursor.substring(lastAtIndex + 1);
      if (!query.includes(' ')) {
        setMentionFilter(query.toLowerCase());
        setShowMentionMenu(true);
        setSelectedMentionIndex(0);
        return;
      }
    }
    setShowMentionMenu(false);
  };

  // Format Text Helper (Bold, Italic, Underline, Code, etc.)
  const applyFormat = (prefix: string, suffix: string = prefix, defaultPlaceholder: string = '') => {
    if (!textareaRef.current) return;
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;

    const selectedText = content.substring(start, end) || defaultPlaceholder;
    const formatted = `${prefix}${selectedText}${suffix}`;

    const newContent = content.substring(0, start) + formatted + content.substring(end);
    setContent(newContent);

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(
          start + prefix.length,
          start + prefix.length + selectedText.length,
        );
      }
    }, 0);
  };

  const applyLinkFormat = () => {
    const url = prompt('Enter URL:', 'https://');
    if (url) {
      applyFormat('[', `](${url})`, 'link text');
    }
  };

  const insertMention = (username: string) => {
    if (!textareaRef.current) return;
    const cursor = textareaRef.current.selectionStart;
    const textBeforeCursor = content.substring(0, cursor);
    const textAfterCursor = content.substring(cursor);

    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    const newText = textBeforeCursor.substring(0, lastAtIndex) + `@${username} ` + textAfterCursor;

    setContent(newText);
    setShowMentionMenu(false);
    textareaRef.current.focus();
  };

  const insertEmoji = (emoji: string) => {
    setContent((prev) => prev + emoji);
    setShowEmojiPicker(false);
    if (textareaRef.current) textareaRef.current.focus();
  };

  const filteredUsers = users.filter(
    (u) =>
      u.username.toLowerCase().includes(mentionFilter) ||
      (u.email && u.email.toLowerCase().includes(mentionFilter)),
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const isMod = e.metaKey || e.ctrlKey;

    // Keyboard Shortcuts inside Textarea (Cmd+B, Cmd+I, Cmd+U, Cmd+Shift+X, Cmd+Shift+C)
    if (isMod) {
      const key = e.key.toLowerCase();
      if (key === 'b') {
        e.preventDefault();
        applyFormat('**', '**', 'bold text');
        return;
      }
      if (key === 'i') {
        e.preventDefault();
        applyFormat('*', '*', 'italic text');
        return;
      }
      if (key === 'u') {
        e.preventDefault();
        applyFormat('<u>', '</u>', 'underlined text');
        return;
      }
      if (e.shiftKey && key === 'x') {
        e.preventDefault();
        applyFormat('~~', '~~', 'strikethrough text');
        return;
      }
      if (e.shiftKey && key === 'c') {
        e.preventDefault();
        applyFormat('```\n', '\n```', 'code block');
        return;
      }
    }

    if (showMentionMenu && filteredUsers.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedMentionIndex((prev) => (prev + 1) % filteredUsers.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedMentionIndex((prev) => (prev - 1 + filteredUsers.length) % filteredUsers.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insertMention(filteredUsers[selectedMentionIndex].username);
        return;
      }
      if (e.key === 'Escape') {
        setShowMentionMenu(false);
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    if (!content.trim() && attachments.length === 0) return;
    onSendMessage(content, attachments, replyingToMessage?.id);
    setContent('');
    setAttachments([]);
    setShowMentionMenu(false);
    if (onCancelReply) onCancelReply();
    if (onTypingStop) onTypingStop();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newAtts: any[] = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      newAtts.push({
        fileName: f.name,
        fileUrl: URL.createObjectURL(f),
        fileSize: f.size,
        mimeType: f.type,
      });
    }

    setAttachments((prev) => [...prev, ...newAtts]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="p-3 md:p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 relative select-none">
      {/* Telegram-Style Reply Preview Bar */}
      {replyingToMessage && (
        <div className="flex items-center justify-between px-3.5 py-2 mb-2 bg-indigo-50/90 dark:bg-indigo-950/50 border-l-4 border-indigo-500 rounded-r-xl shadow-xs text-xs animate-in fade-in slide-in-from-bottom-1 duration-150">
          <div className="flex items-center gap-2.5 min-w-0">
            <Reply className="w-4 h-4 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-indigo-700 dark:text-indigo-300 text-[11px]">
                Replying to {replyingToMessage.sender?.username ? `@${replyingToMessage.sender.username}` : 'User'}
              </span>
              <span className="text-slate-600 dark:text-slate-300 truncate text-xs">
                {replyingToMessage.content}
              </span>
            </div>
          </div>
          <button
            onClick={onCancelReply}
            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-full transition-colors"
            title="Cancel reply"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        className="hidden"
        multiple
      />

      {/* Mention Autocomplete Popover */}
      {showMentionMenu && filteredUsers.length > 0 && (
        <div className="absolute left-6 bottom-full mb-2 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-50">
          <div className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Mention User
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filteredUsers.map((u, idx) => (
              <button
                key={u.id}
                onClick={() => insertMention(u.username)}
                className={`w-full px-3 py-2 flex items-center gap-2 text-xs transition-colors ${
                  idx === selectedMentionIndex
                    ? 'bg-indigo-600 text-white font-semibold'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <img
                  src={u.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${u.username}`}
                  alt={u.username}
                  className="w-5 h-5 rounded-full object-cover"
                />
                <span>@{u.username}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* FULL UNICODE 15.0 EMOJI PICKER POPOVER */}
      {showEmojiPicker && (
        <div
          ref={emojiPickerRef}
          className="absolute left-4 md:left-14 bottom-20 z-50 shadow-2xl rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900 animate-in fade-in slide-in-from-bottom-2 duration-150"
        >
          <EmojiPicker
            theme={Theme.AUTO}
            onEmojiClick={(emojiData) => insertEmoji(emojiData.emoji)}
            lazyLoadEmojis={true}
            searchPlaceHolder="Search all emojis..."
            width={window.innerWidth < 480 ? 290 : 350}
            height={400}
          />
        </div>
      )}

      {/* Attachment Previews */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {attachments.map((att, idx) => (
            <div
              key={idx}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-200 dark:bg-slate-800 rounded-xl text-xs text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700"
            >
              <Paperclip className="w-3 h-3 text-slate-400" />
              <span className="truncate max-w-xs">{att.fileName}</span>
              <button
                onClick={() => setAttachments((prev) => prev.filter((_, i) => i !== idx))}
                className="hover:text-rose-500 ml-1"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* SLACK-STYLE MESSAGE CONTAINER */}
      <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700/80 rounded-2xl shadow-md overflow-hidden focus-within:border-indigo-500 dark:focus-within:border-indigo-500 transition-all">
        {/* TOP TOOLBAR: Formatting Controls (Slack Style) */}
        {showFormatting && (
          <div className="px-3 py-1.5 border-b border-slate-200 dark:border-slate-800 flex items-center gap-0.5 text-slate-600 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-950/40 overflow-x-auto">
            <button
              onClick={() => applyFormat('**', '**', 'bold text')}
              title="Bold (⌘B)"
              className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-600 dark:text-slate-300"
            >
              <Bold className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => applyFormat('*', '*', 'italic text')}
              title="Italic (⌘I)"
              className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-600 dark:text-slate-300"
            >
              <Italic className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => applyFormat('<u>', '</u>', 'underlined text')}
              title="Underline (⌘U)"
              className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-600 dark:text-slate-300"
            >
              <Underline className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => applyFormat('~~', '~~', 'strikethrough text')}
              title="Strikethrough (⌘⇧X)"
              className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-600 dark:text-slate-300"
            >
              <Strikethrough className="w-3.5 h-3.5" />
            </button>

            <span className="w-[1px] h-4 bg-slate-300 dark:bg-slate-800 mx-1 flex-shrink-0" />

            <button
              onClick={applyLinkFormat}
              title="Link"
              className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-600 dark:text-slate-300"
            >
              <Link className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => applyFormat('1. ', '', 'ordered item')}
              title="Ordered List"
              className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-600 dark:text-slate-300"
            >
              <ListOrdered className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => applyFormat('- ', '', 'bullet item')}
              title="Bullet List"
              className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-600 dark:text-slate-300"
            >
              <List className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => applyFormat('> ', '', 'blockquote')}
              title="Blockquote"
              className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-600 dark:text-slate-300"
            >
              <Quote className="w-3.5 h-3.5" />
            </button>

            <span className="w-[1px] h-4 bg-slate-300 dark:bg-slate-800 mx-1 flex-shrink-0" />

            <button
              onClick={() => applyFormat('`', '`', 'code')}
              title="Inline Code"
              className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-600 dark:text-slate-300"
            >
              <Code className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => applyFormat('```\n', '\n```', 'code block')}
              title="Code Block (⌘⇧C)"
              className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-600 dark:text-slate-300"
            >
              <SquareCode className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* MIDDLE: Textarea with Dynamic Height Resizing */}
        <div className="px-3 py-2">
          <textarea
            ref={textareaRef}
            rows={1}
            value={content}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            placeholder={`Message #${channelName}`}
            className="w-full bg-transparent border-0 focus:ring-0 resize-none text-xs md:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 overflow-y-auto focus:outline-none min-h-[36px] max-h-[220px]"
          />
        </div>

        {/* BOTTOM ACTION BAR (Slack Style) */}
        <div className="px-3 py-1.5 bg-slate-50/50 dark:bg-slate-950/40 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
          <div className="flex items-center gap-0.5 md:gap-1 text-slate-500 dark:text-slate-400">
            <button
              onClick={() => fileInputRef.current?.click()}
              title="Attach File"
              className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded hover:text-slate-800 dark:hover:text-slate-200"
            >
              <Plus className="w-4 h-4" />
            </button>

            <button
              onClick={() => setShowFormatting(!showFormatting)}
              title="Formatting Options"
              className={`p-1 rounded transition-colors ${
                showFormatting
                  ? 'bg-indigo-500/20 text-indigo-500'
                  : 'hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Type className="w-4 h-4" />
            </button>

            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              title="All Internet Emojis"
              className={`p-1 rounded transition-colors ${
                showEmojiPicker
                  ? 'bg-indigo-500/20 text-indigo-500'
                  : 'hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Smile className="w-4 h-4 text-amber-500" />
            </button>

            <button
              onClick={() => {
                setContent((prev) => prev + '@');
                if (textareaRef.current) textareaRef.current.focus();
              }}
              title="Mention Someone"
              className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded hover:text-slate-800 dark:hover:text-slate-200"
            >
              <AtSign className="w-4 h-4" />
            </button>

            <span className="w-[1px] h-4 bg-slate-300 dark:bg-slate-800 mx-0.5 flex-shrink-0" />

            <button
              onClick={() => applyFormat('```\n', '\n```', '// snippet')}
              title="Create Snippet"
              className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded hover:text-slate-800 dark:hover:text-slate-200"
            >
              <FileCode className="w-4 h-4" />
            </button>
          </div>

          {/* SEND BUTTON */}
          <div className="flex items-center">
            <button
              onClick={handleSend}
              disabled={!content.trim() && attachments.length === 0}
              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white rounded-lg text-xs font-semibold shadow flex items-center gap-1 transition-all disabled:opacity-30 disabled:pointer-events-none"
            >
              <Send className="w-3.5 h-3.5" />
              <ChevronDown className="w-3 h-3 border-l border-emerald-400/40 ml-0.5 pl-0.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
