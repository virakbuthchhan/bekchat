import React, { useState } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import { Search, X, MessageSquare, Hash } from 'lucide-react';

interface SearchModalProps {
  workspaceId: string;
  onClose: () => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({ workspaceId, onClose }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    try {
      const res = await axios.get(`/api/messages/search?workspaceId=${workspaceId}&q=${encodeURIComponent(query)}`);
      setResults(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-slate-950/80 backdrop-blur-md p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl">
        <form onSubmit={handleSearch} className="p-4 border-b border-slate-800 flex items-center gap-3">
          <Search className="w-5 h-5 text-slate-400" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search all messages in workspace..."
            className="w-full bg-transparent text-slate-100 placeholder-slate-500 text-sm focus:outline-none"
          />
          <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:text-slate-200">
            <X className="w-4 h-4" />
          </button>
        </form>

        <div className="max-h-96 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="text-center text-slate-500 text-xs py-6">Searching...</div>
          ) : results.length === 0 ? (
            <div className="text-center text-slate-500 text-xs py-6">
              {query ? 'No matching messages found.' : 'Type a keyword to start searching.'}
            </div>
          ) : (
            results.map((msg) => (
              <div key={msg.id} className="p-3 bg-slate-800/40 border border-slate-800 rounded-xl space-y-1">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center gap-1.5 font-semibold text-indigo-400">
                    <Hash className="w-3.5 h-3.5" />
                    <span>{msg.channel?.name}</span>
                  </div>
                  <span>{new Date(msg.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="text-slate-200 text-xs prose prose-invert">
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
