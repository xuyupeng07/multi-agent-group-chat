import { Button } from "@/components/ui/button";
import { Phone, Video, MoreVertical } from "lucide-react";
import { Agent } from "@/types/chat";

interface ChatHeaderProps {
  agents: Agent[];
}

const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();
};

export function ChatHeader({ agents }: ChatHeaderProps) {
  return (
    <div className="h-16 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between px-6 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md sticky top-0 z-10">
      <div className="flex items-center gap-3">
        <div className="flex -space-x-2 overflow-hidden">
          {agents.map(agent => (
            <div key={agent.id} className="h-8 w-8 rounded-full ring-2 ring-white dark:ring-zinc-950 bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-xs border-2 border-white dark:border-zinc-950">
              {getInitials(agent.name)}
            </div>
          ))}
          <div className="h-8 w-8 rounded-full ring-2 ring-white dark:ring-zinc-950 bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-xs font-medium text-zinc-500">
            +1
          </div>
        </div>
        <div className="flex flex-col">
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">Multi-Agent Collaboration</h2>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs text-zinc-500">{agents.length} agents active</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="text-zinc-500">
          <Phone className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" className="text-zinc-500">
          <Video className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" className="text-zinc-500">
          <MoreVertical className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}