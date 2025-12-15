import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Agent } from "@/types/chat";

interface AgentListProps {
  show: boolean;
  filteredAgents: Agent[];
  onSelectAgent: (agentName: string) => void;
}

const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();
};

export function AgentList({ show, filteredAgents, onSelectAgent }: AgentListProps) {
  if (!show || filteredAgents.length === 0) return null;

  return (
    <div className="absolute bottom-full left-0 mb-2 w-64 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
      {filteredAgents.map((agent) => (
        <button
          key={agent.id}
          onClick={() => onSelectAgent(agent.name)}
          className="w-full px-4 py-2 text-left hover:bg-zinc-100 dark:hover:bg-zinc-700 text-sm text-zinc-900 dark:text-zinc-100 transition-colors flex items-center gap-3"
        >
          <Avatar className="h-8 w-8">
            <AvatarFallback className={`${agent.color} text-white text-xs font-medium`}>
              {getInitials(agent.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="font-medium truncate">{agent.name}</div>
            <div className="text-xs text-zinc-500 dark:text-zinc-400 truncate">{agent.role}</div>
          </div>
        </button>
      ))}
    </div>
  );
}