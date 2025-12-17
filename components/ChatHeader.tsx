"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Phone, Video, MoreVertical } from "lucide-react";
import { Agent } from "@/types/chat";

interface ChatHeaderProps {
  agents: Agent[];
}

export function ChatHeader({ agents }: ChatHeaderProps) {
  const [onlineAgentsCount, setOnlineAgentsCount] = useState<number>(0);

  // 从数据库获取在线智能体数量
  useEffect(() => {
    const fetchOnlineAgentsCount = async () => {
      try {
        const response = await fetch('/api/agents/online-count');
        if (response.ok) {
          const data = await response.json();
          setOnlineAgentsCount(data.count);
        } else {
          console.error('Failed to fetch online agents count');
          // 如果获取失败，使用传入的agents数组中状态为online的数量
          const onlineCount = agents.filter(agent => agent.status === 'online').length;
          setOnlineAgentsCount(onlineCount);
        }
      } catch (error) {
        console.error('Error fetching online agents count:', error);
        // 如果发生错误，使用传入的agents数组中状态为online的数量
        const onlineCount = agents.filter(agent => agent.status === 'online').length;
        setOnlineAgentsCount(onlineCount);
      }
    };

    fetchOnlineAgentsCount();
  }, [agents]);

  return (
    <div className="h-16 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between px-6 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md sticky top-0 z-10">
      <div className="flex items-center gap-3">
        <div className="flex flex-col">
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">Multi-Agent Collaboration</h2>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs text-zinc-500">{onlineAgentsCount} agents active</span>
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