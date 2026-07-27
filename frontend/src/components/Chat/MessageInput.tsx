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
  Play,
  Pause,
  Trash,
  Image,
  Loader2,
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
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  // Voice Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<any>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

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

  // Voice Recording Logic
  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        const reader = new FileReader();
        reader.onloadend = () => {
          setAudioPreviewUrl(reader.result as string);
        };
        reader.readAsDataURL(blob);

        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);

      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      alert('Unable to access microphone. Please grant microphone permission in your browser.');
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    }
  };

  const cancelVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setAudioPreviewUrl(null);
    setAudioBlob(null);
    setIsPlayingPreview(false);
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
  };

  const togglePlayPreview = () => {
    if (!audioPreviewUrl) return;
    if (!previewAudioRef.current || previewAudioRef.current.src !== audioPreviewUrl) {
      previewAudioRef.current = new Audio(audioPreviewUrl);
      previewAudioRef.current.onended = () => setIsPlayingPreview(false);
    }

    if (isPlayingPreview) {
      previewAudioRef.current.pause();
      setIsPlayingPreview(false);
    } else {
      previewAudioRef.current.play();
      setIsPlayingPreview(true);
    }
  };

  // Helper for single & chunked uploads
  const uploadFileInChunks = async (
    file: File | Blob,
    fileName: string,
    mimeType: string,
    onProgress?: (percent: number) => void
  ): Promise<any> => {
    const CHUNK_SIZE = 1024 * 1024; // 1 MB chunks
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

    if (totalChunks <= 1) {
      const reader = new FileReader();
      const base64Data = await new Promise<string>((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });

      const res = await axios.post('/api/upload/single', {
        fileName,
        mimeType,
        data: base64Data,
      });
      if (onProgress) onProgress(100);
      return res.data;
    }

    const initRes = await axios.post('/api/upload/init', {
      fileName,
      totalChunks,
      mimeType,
    });
    const { uploadId } = initRes.data;

    for (let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK_SIZE;
      const end = Math.min(file.size, start + CHUNK_SIZE);
      const chunkBlob = file.slice(start, end);

      const reader = new FileReader();
      const chunkBase64 = await new Promise<string>((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(chunkBlob);
      });

      await axios.post('/api/upload/chunk', {
        uploadId,
        chunkIndex: i,
        totalChunks,
        data: chunkBase64,
      });

      const progress = Math.round(((i + 1) / totalChunks) * 100);
      if (onProgress) onProgress(progress);
    }

    const completeRes = await axios.post('/api/upload/complete', {
      uploadId,
      fileName,
      mimeType,
    });

    return completeRes.data;
  };

  const sendVoiceNote = async () => {
    if (!audioBlob) return;
    const fileName = `Voice_Note_${new Date().toISOString().substring(11, 19).replace(/:/g, '-')}.webm`;
    const mimeType = 'audio/webm';

    try {
      const uploaded = await uploadFileInChunks(audioBlob, fileName, mimeType);
      const voiceAtt = {
        fileName: uploaded.fileName,
        fileUrl: uploaded.fileUrl,
        fileSize: uploaded.fileSize,
        mimeType: uploaded.mimeType,
      };

      onSendMessage('', [...attachments, voiceAtt], replyingToMessage?.id);
      cancelVoiceRecording();
      setAttachments([]);
      if (onCancelReply) onCancelReply();
      if (onTypingStop) onTypingStop();
    } catch (err) {
      alert('Failed to upload voice message. Please try again.');
    }
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // DataURL & Chunked File Processor for images, videos, documents, zip, etc.
  const processFiles = (files: FileList | File[]) => {
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const tempId = `${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`;

      setAttachments((prev) => [
        ...prev,
        {
          tempId,
          fileName: file.name,
          fileUrl: '',
          fileSize: file.size,
          mimeType: file.type || 'application/octet-stream',
          isUploading: true,
          progress: 0,
        },
      ]);

      uploadFileInChunks(file, file.name, file.type || 'application/octet-stream', (progress) => {
        setAttachments((prev) =>
          prev.map((att) => (att.tempId === tempId ? { ...att, progress } : att))
        );
      })
        .then((uploaded) => {
          setAttachments((prev) =>
            prev.map((att) =>
              att.tempId === tempId
                ? {
                    ...att,
                    fileUrl: uploaded.fileUrl,
                    fileSize: uploaded.fileSize,
                    isUploading: false,
                    progress: 100,
                  }
                : att
            )
          );
        })
        .catch(() => {
          setAttachments((prev) => prev.filter((att) => att.tempId !== tempId));
          alert(`Failed to upload file ${file.name}`);
        });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
    if (e.dataTransfer.files) {
      processFiles(e.dataTransfer.files);
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

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="p-3 md:p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 relative select-none"
    >
      {/* Drag & Drop Visual Overlay */}
      {isDraggingOver && (
        <div className="absolute inset-0 z-50 bg-indigo-600/90 backdrop-blur-xs rounded-2xl flex flex-col items-center justify-center text-white border-2 border-dashed border-white m-2 select-none animate-in fade-in duration-100">
          <Paperclip className="w-8 h-8 mb-2 animate-bounce" />
          <span className="font-bold text-sm">Drop files to attach to message</span>
          <span className="text-xs text-indigo-200">Photos, videos, audio, documents, zip, and more</span>
        </div>
      )}

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

      {/* Voice Recording Control Bar */}
      {(isRecording || audioPreviewUrl) && (
        <div className="flex items-center justify-between p-3 mb-2 bg-rose-50/90 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/60 rounded-2xl shadow-xs text-xs animate-in fade-in slide-in-from-bottom-1 duration-150">
          <div className="flex items-center gap-3">
            {isRecording ? (
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-rose-500 rounded-full animate-ping" />
                <span className="font-mono font-bold text-xs text-rose-600 dark:text-rose-400">
                  Recording {formatTimer(recordingSeconds)}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={togglePlayPreview}
                  className="p-2 bg-rose-600 hover:bg-rose-500 text-white rounded-full transition-transform active:scale-95 shadow"
                >
                  {isPlayingPreview ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
                </button>
                <span className="font-mono font-bold text-xs text-rose-600 dark:text-rose-400">
                  Voice Note Preview ({formatTimer(recordingSeconds)})
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={cancelVoiceRecording}
              className="p-1.5 text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors"
              title="Discard voice message"
            >
              <Trash className="w-4 h-4" />
            </button>

            {isRecording ? (
              <button
                onClick={stopVoiceRecording}
                className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold shadow"
              >
                Done
              </button>
            ) : (
              <button
                onClick={sendVoiceNote}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow flex items-center gap-1.5 transition-all"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send Voice Note</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        className="hidden"
        multiple
        accept="*"
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
          {attachments.map((att, idx) => {
            const isImg = att.mimeType?.startsWith('image/');
            const isVid = att.mimeType?.startsWith('video/');
            const isAud = att.mimeType?.startsWith('audio/');

            return (
              <div
                key={att.tempId || idx}
                className="flex items-center gap-2 p-1.5 bg-slate-200 dark:bg-slate-800 rounded-xl text-xs text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 shadow-xs"
              >
                {att.isUploading ? (
                  <Loader2 className="w-4 h-4 text-indigo-500 animate-spin flex-shrink-0" />
                ) : isImg ? (
                  <img src={att.fileUrl} alt={att.fileName} className="w-7 h-7 rounded object-cover" />
                ) : isVid ? (
                  <Video className="w-4 h-4 text-indigo-500" />
                ) : isAud ? (
                  <Mic className="w-4 h-4 text-rose-500" />
                ) : (
                  <Paperclip className="w-4 h-4 text-slate-400" />
                )}
                <div className="flex flex-col truncate max-w-xs">
                  <span className="truncate font-medium">{att.fileName}</span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {att.isUploading
                      ? `Uploading... ${att.progress || 0}%`
                      : `${(att.fileSize / 1024).toFixed(1)} KB`}
                  </span>
                </div>
                <button
                  onClick={() => setAttachments((prev) => prev.filter((_, i) => i !== idx))}
                  className="hover:text-rose-500 p-1 text-slate-400"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
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
              title="Attach File (Photos, Videos, PDFs, Docs, Audio)"
              className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded hover:text-slate-800 dark:hover:text-slate-200"
            >
              <Plus className="w-4 h-4" />
            </button>

            <button
              onClick={startVoiceRecording}
              title="Record Voice Message"
              className={`p-1 rounded transition-colors ${
                isRecording
                  ? 'bg-rose-500/20 text-rose-500 animate-pulse'
                  : 'hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Mic className="w-4 h-4 text-rose-500" />
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
              disabled={(!content.trim() && attachments.length === 0) || attachments.some((a) => a.isUploading)}
              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white rounded-lg text-xs font-semibold shadow flex items-center gap-1 transition-all disabled:opacity-30 disabled:pointer-events-none"
            >
              {attachments.some((a) => a.isUploading) ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              <ChevronDown className="w-3 h-3 border-l border-emerald-400/40 ml-0.5 pl-0.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
