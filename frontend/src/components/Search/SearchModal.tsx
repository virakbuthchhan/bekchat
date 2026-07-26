import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import { Search, X, Hash, Calendar, User, ArrowRight } from 'lucide-react';

interface SearchModalProps {
  workspaceId: string;
  onClose: () => void;
  onSelectChannel?: (channel: any) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({ workspaceId, onClose, onSelectChannel }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(() => {
      performSearch(query.trim());
    }, 300);

    return () => clearTimeout(timer);
  }, [query, workspaceId]);

  const performSearch = async (searchTerm: string) => {
    if (!searchTerm) return;
    setLoading(true);
    try {
      const res = await axios.get(
        `/api/messages/search?workspaceId=${workspaceId}&q=${encodeURIComponent(searchTerm)}`,
      );
      setResults(res.data.messages || (Array.isArray(res.data) ? res.data : []));
    } catch (e) {
      console.error('Search error:', e);
      setResults([]);
    } flex: {
      setLoading(false);
    }
  };

  const handleResultClick = (msg: any) => {
    if (onSelectChannel && msg.channel) {
      onSelectChannel(msg.channel);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 md:pt-20 bg-slate-950/80 backdrop-blur-md p-4 select-none">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[80vh]">
        {/* Search Header Form */}
        <form onSubmit={(e) => { e.preventDefault(); performSearch(query); }} className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3 bg-slate-50 dark:bg-slate-950">
          <Search className="w-5 h-5 text-indigo-500 flex-shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search all channel messages by keywords..."
            className="w-full bg-transparent text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-sm font-semibold focus:outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </form>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-white dark:bg-slate-900">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-10 text-slate-400 dark:text-slate-500 space-y-2">
              <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-semibold">Searching messages...</span>
            </div>
          ) : results.length === 0 ? (
            <div className="text-center text-slate-400 dark:text-slate-500 text-xs py-10">
              {query.trim() ? (
                <div className="space-y-1">
                  <p className="font-semibold text-slate-700 dark:text-slate-300">No matching messages found</p>
                  <p className="text-[11px]">Try searching with a different keyword</p>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="font-semibold text-slate-700 dark:text-slate-300">Search Bek-Chat Workspace</p>
                  <p className="text-[11px]">Type keywords to instantly find past conversations</p>
                </div>
              )}
            </div>
          ) : (
            results.map((msg) => (
              <div
                key={msg.id}
                onClick={() => handleResultClick(msg)}
                className="group p-4 bg-slate-50 dark:bg-slate-950/60 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 border border-slate-200 dark:border-slate-800 hover:border-indigo-500/40 rounded-2xl cursor-pointer transition-all space-y-2 shadow-sm"
              >
                {/* Header Meta */}
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold rounded-lg text-[11px] inline-flex items-center gap-1">
                      <Hash className="w-3 h-3" />
                      {msg.channel?.name || 'channel'}
                    </span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1 text-[11px]">
                      <User className="w-3 h-3 text-slate-400" />
                      @{msg.sender?.username || 'User'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 text-[11px] text-slate-400 group-hover:text-indigo-500 transition-colors">
                    <Calendar className="w-3 h-3" />
                    <span>{new Date(msg.createdAt).toLocaleDateString()}</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>

                {/* Message Content Preview */}
                <div className="text-slate-800 dark:text-slate-200 text-xs leading-relaxed prose dark:prose-invert max-w-none line-clamp-3">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
