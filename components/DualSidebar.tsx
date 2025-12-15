"use client";

import { useState, useEffect, useRef } from "react";
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
  const [initialLoad, setInitialLoad] = useState(true);
  
  // 使用useRef来保存函数，使其可以被外部调用
  const loadChatHistoryRef = useRef<(() => Promise<void>) | null>(null);
  const addChatItemRef = useRef<((chatItem: ChatHistoryItem) => void) | null>(null);
  const updateChatItemRef = useRef<((chatId: string, updates: Partial<ChatHistoryItem>) => void) | null>(null);
  
  // 格式化日期显示文本的辅助函数
  const formatDateText = (updatedAt: string) => {
    const updatedDate = new Date(updatedAt);
    const now = new Date();
    
    // 获取本地时间的日期部分（忽略时间），用于计算天数差异
    const updatedDateOnly = new Date(updatedDate.getFullYear(), updatedDate.getMonth(), updatedDate.getDate());
    const nowDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // 计算天数差异（基于本地时间）
    const diffTime = nowDateOnly.getTime() - updatedDateOnly.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    let dateText;
    if (diffDays === 0) {
      // 今天的聊天显示具体时间，如 "14:30"
      dateText = updatedDate.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
    } else if (diffDays === 1) {
      dateText = '昨天';
    } else if (diffDays <= 7) {
      dateText = `${diffDays}天前`;
    } else {
      dateText = updatedDate.toLocaleDateString('zh-CN');
    }
    
    return dateText;
  };
  
  // 从API加载聊天历史
  const loadChatHistory = async () => {
    try {
      // 只有初始加载时才显示loading状态
      if (initialLoad) {
        setLoading(true);
      }
      const response = await fetch('/api/chats');
      if (response.ok) {
        const data = await response.json();
        // 对每个聊天项的日期进行格式化
        const formattedData = data.map((item: any) => ({
          ...item,
          date: formatDateText(item.date)
        }));
        setChatHistory(formattedData);
      } else {
        console.error('Failed to load chat history');
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  };
  
  // 添加新的聊天项到列表顶部
  const addChatItem = (chatItem: ChatHistoryItem) => {
    // 如果传入的date是ISO字符串，需要格式化
    const formattedChatItem = {
      ...chatItem,
      date: chatItem.date.includes('T') ? formatDateText(chatItem.date) : chatItem.date
    };
    
    setChatHistory(prev => {
      // 检查是否已存在，避免重复添加
      const existingIndex = prev.findIndex(item => item.id === formattedChatItem.id);
      if (existingIndex !== -1) {
        // 如果已存在，更新该项并移到顶部
        const updatedHistory = [...prev];
        updatedHistory[existingIndex] = formattedChatItem;
        return [formattedChatItem, ...updatedHistory.filter(item => item.id !== formattedChatItem.id)];
      } else {
        // 如果不存在，添加到顶部
        return [formattedChatItem, ...prev];
      }
    });
  };
  
  // 更新现有聊天项
  const updateChatItem = (chatId: string, updates: Partial<ChatHistoryItem>) => {
    setChatHistory(prev => 
      prev.map(item => {
        if (item.id === chatId) {
          // 如果更新的是date字段且是ISO字符串，需要格式化
          if (updates.date && updates.date.includes('T')) {
            return { ...item, ...updates, date: formatDateText(updates.date) };
          }
          return { ...item, ...updates };
        }
        return item;
      })
    );
  };
  
  // 将函数保存到ref中
  useEffect(() => {
    loadChatHistoryRef.current = loadChatHistory;
    addChatItemRef.current = addChatItem;
    updateChatItemRef.current = updateChatItem;
    // 初始加载
    loadChatHistory();
  }, []);
  
  // 暴露函数给父组件
  useEffect(() => {
    // 将函数添加到window对象上，供父组件调用
    (window as any).refreshChatHistory = loadChatHistory;
    (window as any).addChatItem = addChatItem;
    (window as any).updateChatItem = updateChatItem;
    
    // 清理函数
    return () => {
      delete (window as any).refreshChatHistory;
      delete (window as any).addChatItem;
      delete (window as any).updateChatItem;
    };
  }, [loadChatHistory, addChatItem, updateChatItem]);
  
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