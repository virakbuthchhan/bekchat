import React from 'react';
import { Plus, MessageSquare } from 'lucide-react';

interface Workspace {
  id: string;
  name: string;
  slug: string;
  iconUrl?: string;
}

interface WorkspaceBarProps {
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  onSelectWorkspace: (id: string) => void;
  onCreateWorkspace: () => void;
}

export const WorkspaceBar: React.FC<WorkspaceBarProps> = ({
  workspaces,
  activeWorkspaceId,
  onSelectWorkspace,
  onCreateWorkspace,
}) => {
  return (
    <div className="w-16 bg-slate-900 dark:bg-slate-950 flex flex-col items-center py-4 gap-3 border-r border-slate-200 dark:border-slate-800 flex-shrink-0">
      {/* App Logo */}
      <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-600/30 mb-2">
        <MessageSquare className="w-5 h-5" />
      </div>

      <div className="w-8 h-px bg-slate-200 dark:bg-slate-800 my-1" />

      {/* Workspaces list */}
      <div className="flex-1 w-full flex flex-col items-center gap-3 overflow-y-auto">
        {workspaces.map((ws) => {
          const isActive = ws.id === activeWorkspaceId;
          const initial = ws.name.charAt(0).toUpperCase();

          return (
            <button
              key={ws.id}
              onClick={() => onSelectWorkspace(ws.id)}
              title={ws.name}
              className={`relative group w-10 h-10 rounded-xl flex items-center justify-center font-semibold text-sm transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white rounded-xl shadow-md'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white rounded-2xl hover:rounded-xl'
              }`}
            >
              {/* Active Indicator bar */}
              <span
                className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 bg-indigo-500 rounded-r transition-all ${
                  isActive ? 'h-6' : 'h-0 group-hover:h-3'
                }`}
              />

              {ws.iconUrl ? (
                <img src={ws.iconUrl} alt={ws.name} className="w-full h-full rounded-xl object-cover" />
              ) : (
                <span>{initial}</span>
              )}
            </button>
          );
        })}

        <button
          onClick={onCreateWorkspace}
          title="Create Workspace"
          className="w-10 h-10 rounded-2xl bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-indigo-400 flex items-center justify-center transition-all border border-dashed border-slate-700 hover:border-indigo-500/50"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
