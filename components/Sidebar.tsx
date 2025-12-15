import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Users, Settings, LogOut, Plus, Search } from "lucide-react";
import { Agent } from "@/types/chat";

interface SidebarProps {
  agents: Agent[];
  onNewChat: () => void;
}

const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();
};

export function Sidebar({ agents, onNewChat }: SidebarProps) {
  return (
    <div className="w-80 bg-zinc-50/50 dark:bg-zinc-900/50 border-r border-zinc-200 dark:border-zinc-800 flex flex-col hidden md:flex">
      {/* Sidebar Header */}
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center">
            <Users className="h-5 w-5 text-white" />
          </div>
          <span className="font-bold text-lg text-zinc-800 dark:text-zinc-100">Team Space</span>
        </div>
        <Button variant="ghost" size="icon" className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
          <Settings className="h-5 w-5" />
        </Button>
      </div>
      
      {/* New Chat Button */}
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
        <Button 
          onClick={onNewChat}
          className="w-full justify-start gap-2 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          variant="ghost"
        >
          <Plus className="h-4 w-4" />
          New Chat
        </Button>
      </div>
        
      {/* Search */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
            <Input
              placeholder="Search agents..."
              className="pl-9 bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700"
            />
          </div>
        </div>

        {/* Agents List */}
        <ScrollArea className="flex-1 px-2">
          <div className="space-y-1 p-2">
            <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 px-2 mb-2 uppercase tracking-wider">
              Active Agents
            </div>
            {agents.map((agent) => (
              <button
                key={agent.id}
                className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 transition-colors text-left group"
              >
                <div className="relative">
                  <Avatar className="h-10 w-10 border-2 border-white dark:border-zinc-900">
                    <AvatarFallback className={`${agent.color} text-white font-medium`}>
                      {getInitials(agent.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white dark:border-zinc-900 ${agent.status === 'online' ? 'bg-green-500' :
                      agent.status === 'busy' ? 'bg-red-500' : 'bg-zinc-400'
                    }`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-zinc-900 dark:text-zinc-100 truncate">
                    {agent.name}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                    {agent.role}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Stats / Footer */}
      <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-100/50 dark:bg-zinc-900/50">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-indigo-600 text-white">ME</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">User</p>
            <p className="text-xs text-zinc-500">Online</p>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <LogOut className="h-4 w-4 text-zinc-500" />
          </Button>
        </div>
      </div>
    </div>
  );
}