import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import { format } from 'date-fns';
import { X, Send, MessageSquare } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

interface Message {
  id: string;
  channelId: string;
  content: string;
  createdAt: string;
  sender?: {
    username: string;
    avatarUrl: string;
  };
}

interface ThreadPanelProps {
  parentMessage: Message;
  onClose: () => void;
  onSendReply: (parentId: string, content: string) => void;
}

export const ThreadPanel: React.FC<ThreadPanelProps> = ({ parentMessage, onClose, onSendReply }) => {
  const { t } = useLanguage();
  const [replies, setReplies] = useState<Message[]>([]);
  const [replyContent, setReplyContent] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchThread();
  }, [parentMessage.id]);

  const fetchThread = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/messages/thread/${parentMessage.id}`);
      setReplies(res.data.replies || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = () => {
    if (!replyContent.trim()) return;
    onSendReply(parentMessage.id, replyContent);
    setReplyContent('');
    setTimeout(fetchThread, 300);
  };

  return (
    <div className="w-80 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex flex-col h-full flex-shrink-0">
      {/* Header */}
      <div className="h-14 px-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between font-bold text-slate-900 dark:text-slate-100">
        <div className="flex items-center gap-2 text-sm">
          <MessageSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <span>{t('common.reply', 'Thread Replies')}</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Parent message */}
      <div className="p-4 bg-slate-50 dark:bg-slate-950/40 border-b border-slate-200 dark:border-slate-800/80">
        <div className="flex items-center gap-2 mb-1.5">
          <img
            src={parentMessage.sender?.avatarUrl}
            alt={parentMessage.sender?.username}
            className="w-6 h-6 rounded-full object-cover"
          />
          <span className="font-bold text-slate-900 dark:text-slate-100 text-xs">{parentMessage.sender?.username}</span>
          <span className="text-[10px] text-slate-500">
            {format(new Date(parentMessage.createdAt), 'h:mm a')}
          </span>
        </div>
        <div className="text-slate-800 dark:text-slate-200 text-xs leading-relaxed prose dark:prose-invert">
          <ReactMarkdown>{parentMessage.content}</ReactMarkdown>
        </div>
      </div>

      {/* Replies list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="text-center text-slate-400 text-xs py-4">{t('common.loading', 'Loading replies...')}</div>
        ) : replies.length === 0 ? (
          <div className="text-center text-slate-400 text-xs py-4">{t('chat.start_conversation', 'No replies yet. Start the thread!')}</div>
        ) : (
          replies.map((reply) => (
            <div key={reply.id} className="flex gap-2.5 items-start bg-slate-100 dark:bg-slate-800/40 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800/50">
              <img
                src={reply.sender?.avatarUrl}
                alt={reply.sender?.username}
                className="w-6 h-6 rounded-full object-cover mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-semibold text-slate-900 dark:text-slate-100 text-xs">{reply.sender?.username}</span>
                  <span className="text-[10px] text-slate-400">
                    {format(new Date(reply.createdAt), 'h:mm a')}
                  </span>
                </div>
                <div className="text-slate-800 dark:text-slate-200 text-xs prose dark:prose-invert">
                  <ReactMarkdown>{reply.content}</ReactMarkdown>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Reply input */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={`${t('common.reply', 'Reply')}...`}
            className="flex-1 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:border-indigo-500"
          />
          <button
            onClick={handleSend}
            disabled={!replyContent.trim()}
            className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-all disabled:opacity-40"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
