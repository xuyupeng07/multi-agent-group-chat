"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Phone, Video, MoreVertical, MessageCircle } from "lucide-react";
import { Agent } from "@/types/chat";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ChatHeaderProps {
  agents: Agent[];
  isDiscussionMode?: boolean;
  onDiscussionModeChange?: (enabled: boolean) => void;
  discussionRounds?: number;
  onDiscussionRoundsChange?: (rounds: number) => void;
}

export function ChatHeader({ agents, isDiscussionMode = false, onDiscussionModeChange, discussionRounds = 3, onDiscussionRoundsChange }: ChatHeaderProps) {
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
        <Button 
          variant={isDiscussionMode ? "default" : "ghost"} 
          size="sm" 
          className={`${isDiscussionMode ? "bg-blue-600 hover:bg-blue-700 text-white" : "text-zinc-500"} mr-2`}
          onClick={() => onDiscussionModeChange && onDiscussionModeChange(!isDiscussionMode)}
        >
          <MessageCircle className="h-4 w-4 mr-1.5" />
          {isDiscussionMode ? "讨论中" : "开启讨论"}
        </Button>
        
        {isDiscussionMode && (
          <div className="flex items-center gap-2 mr-2">
            <span className="text-sm text-zinc-600">讨论轮数:</span>
            <Select value={discussionRounds.toString()} onValueChange={(value: string) => onDiscussionRoundsChange && onDiscussionRoundsChange(parseInt(value))}>
              <SelectTrigger className="w-16 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1</SelectItem>
                <SelectItem value="2">2</SelectItem>
                <SelectItem value="3">3</SelectItem>
                <SelectItem value="4">4</SelectItem>
                <SelectItem value="5">5</SelectItem>
                <SelectItem value="6">6</SelectItem>
                <SelectItem value="7">7</SelectItem>
                <SelectItem value="8">8</SelectItem>
                <SelectItem value="9">9</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
        
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