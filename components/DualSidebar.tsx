"use client";

import { useState, useEffect } from "react";
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
  onAgentSelect: (agent: Agent) => void;
  onAddAgent?: () => void;
}

export function DualSidebar({ agents, onNewChat, onChatSelect, onAgentSelect, onAddAgent }: DualSidebarProps) {
  const [activeView, setActiveView] = useState<'chats' | 'agents'>('chats');
  const [chatHistory, setChatHistory] = useState<ChatHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // 从API加载聊天历史
  useEffect(() => {
    const loadChatHistory = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/chats');
        if (response.ok) {
          const data = await response.json();
          setChatHistory(data);
        } else {
          console.error('Failed to load chat history');
        }
      } catch (error) {
        console.error('Error loading chat history:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadChatHistory();
  }, []);
  
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
        chatHistory={chatHistory}
        loading={loading}
        onChatSelect={handleChatSelect}
        onAgentSelect={onAgentSelect}
        onAddAgent={onAddAgent}
      />
    </aside>
  );
}