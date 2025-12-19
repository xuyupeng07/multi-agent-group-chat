import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AgentAvatar } from "@/components/AgentAvatar";
import { cn } from "@/lib/utils";
import { Agent } from "@/types/chat";

interface AgentListProps {
  show: boolean;
  filteredAgents: Agent[];
  onSelectAgent: (agentName: string) => void;
  selectedIndex: number;
}

const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();
};

export function AgentList({ show, filteredAgents, onSelectAgent, selectedIndex }: AgentListProps) {
  if (!show || filteredAgents.length === 0) return null;

  return (
    <div className="absolute bottom-full left-0 mb-2 w-max min-w-max bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
      {filteredAgents.map((agent, index) => (
        <button
          key={agent.id}
          onClick={() => onSelectAgent(agent.name)}
          className={`w-full px-4 py-2 text-left text-sm transition-colors flex items-center gap-3 ${
            index === selectedIndex 
              ? "bg-indigo-100 dark:bg-indigo-900 text-indigo-900 dark:text-indigo-100" 
              : "hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100"
          }`}
        >
          <AgentAvatar agent={agent} size="sm" />
          <div className="flex-1 min-w-0">
            <div className="font-medium truncate">{agent.name}</div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400 truncate">{agent.role}</div>
          </div>
        </button>
      ))}
    </div>
  );
}