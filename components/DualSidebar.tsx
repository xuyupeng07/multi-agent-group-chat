"use client";

import { useState } from "react";
import { LeftSidebar } from "./LeftSidebar";
import { RightSidebar } from "./RightSidebar";
import { Agent } from "@/types/chat";

interface ChatHistoryItem {
  id: string;
  title: string;
  date: string;
  preview: string;
}

interface DualSidebarProps {
  agents: Agent[];
  onNewChat: () => void;
  onChatSelect?: (chatId: string) => void;
}

// 模拟聊天历史数据
const mockChatHistory: ChatHistoryItem[] = [
  {
    id: "1",
    title: "旅行计划咨询",
    date: "今天",
    preview: "我想了解一下去日本旅行的最佳季节..."
  },
  {
    id: "2",
    title: "酒店预订建议",
    date: "昨天",
    preview: "请问在东京有哪些推荐的酒店..."
  },
  {
    id: "3",
    title: "美食推荐",
    date: "3天前",
    preview: "在京都有什么必吃的美食吗..."
  },
  {
    id: "4",
    title: "交通路线规划",
    date: "一周前",
    preview: "从大阪到京都最方便的交通方式..."
  },
];

export function DualSidebar({ agents, onNewChat, onChatSelect }: DualSidebarProps) {
  const [activeView, setActiveView] = useState<'chats' | 'agents'>('chats');
  
  const handleChatSelect = (chatId: string) => {
    if (onChatSelect) {
      onChatSelect(chatId);
    }
  };
  
  return (
    <aside className="flex">
      <LeftSidebar
        activeView={activeView}
        onViewChange={setActiveView}
        onNewChat={onNewChat}
      />
      <RightSidebar
        activeView={activeView}
        agents={agents}
        chatHistory={mockChatHistory}
        onChatSelect={handleChatSelect}
      />
    </aside>
  );
}