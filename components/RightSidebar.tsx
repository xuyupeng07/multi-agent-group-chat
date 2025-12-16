"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Search, MessageSquare, Bot, Plus } from "lucide-react";
import { Agent } from "@/types/chat";

interface ChatHistoryItem {
  id: string;
  title: string;
  date: string;
  preview: string;
}

interface RightSidebarProps {
  activeView: 'chats' | 'agents';
  agents: Agent[];
  chatHistory: ChatHistoryItem[];
  loading?: boolean;
  onChatSelect: (chatId: string) => void;
  onAgentSelect: (agent: Agent) => void;
  onAddAgent?: () => void;
}

interface ChatHistoryItem {
  id: string;
  title: string;
  date: string;
  preview: string;
}

export function RightSidebar({ activeView, agents, chatHistory, loading = false, onChatSelect, onAgentSelect, onAddAgent }: RightSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  
  // 过滤聊天历史
  const filteredChatHistory = chatHistory.filter(chat => 
    chat.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chat.preview.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // 过滤智能体
  const filteredAgents = agents.filter(agent => 
    agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    agent.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (agent.introduction && agent.introduction.toLowerCase().includes(searchQuery.toLowerCase()))
  );
  
  return (
    <div className="h-screen w-52 flex flex-col bg-slate-50 dark:bg-slate-900 sm:w-60 border-r border-slate-200 dark:border-slate-700 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-8">
        <div className="flex items-center">
          <h2 className="inline text-lg font-medium text-slate-800 dark:text-slate-200">
            {activeView === 'chats' ? '聊天记录' : '智能体'}
          </h2>
          {activeView === 'chats' && (
            <span className="ml-2 rounded-full bg-blue-600 px-2 py-1 text-xs text-slate-200">
              {chatHistory.length}
            </span>
          )}
        </div>
        {activeView === 'agents' && onAddAgent && (
          <button
            onClick={onAddAgent}
            className="rounded-lg p-1.5 text-slate-500 transition-colors duration-200 hover:bg-slate-200 focus:outline-none dark:text-slate-400 dark:hover:bg-slate-800"
            title="添加智能体"
          >
            <Plus className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Search */}
      <div className="mx-2 space-y-4">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
          <Input
            type="text"
            className="w-full rounded-lg border border-slate-300 bg-slate-50 p-3 pl-9 pr-10 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            placeholder={activeView === 'chats' ? "搜索聊天记录" : "搜索智能体"}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto mx-2 mt-4 space-y-2">
        {activeView === 'chats' ? (
          // 聊天历史列表
          <div className="space-y-2">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              </div>
            ) : filteredChatHistory.length > 0 ? (
              filteredChatHistory.map((chat) => (
                <button
                  key={chat.id}
                  onClick={() => onChatSelect(chat.id)}
                  className="flex w-full flex-col gap-y-2 rounded-lg px-3 py-2 text-left transition-colors duration-200 hover:bg-slate-200 focus:outline-none dark:hover:bg-slate-800"
                >
                  <h3 className="text-sm font-medium capitalize text-slate-700 dark:text-slate-200">
                    {chat.title}
                  </h3>
                  <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                    {chat.preview}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {chat.date}
                  </p>
                </button>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <MessageSquare className="h-12 w-12 text-slate-400 mb-2" />
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {searchQuery ? "没有找到匹配的聊天记录" : "暂无聊天记录"}
                </p>
              </div>
            )}
          </div>
        ) : (
          // 智能体列表
          <div className="space-y-2">
            {filteredAgents.length > 0 ? (
              filteredAgents.map((agent) => (
                <button
                  key={agent.id}
                  onClick={() => onAgentSelect(agent)}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors duration-200 hover:bg-slate-200 focus:outline-none dark:hover:bg-slate-800"
                  data-agent-button
                >
                  <div className="relative">
                    <div className={`h-10 w-10 rounded-full ${agent.color} flex items-center justify-center text-white font-medium`}>
                      {agent.name.charAt(0).toUpperCase()}
                    </div>
                    <span className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white dark:border-slate-900 ${
                      agent.status === 'online' ? 'bg-green-500' :
                      agent.status === 'busy' ? 'bg-yellow-500' : 'bg-red-500'
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0 flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-slate-900 dark:text-slate-100 truncate">
                        {agent.name}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {agent.role}
                      </p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 truncate">
                        {agent.introduction || '暂无介绍'}
                      </p>
                    </div>
                    {agent.name === '旅行管家' && (
                      <span 
                        className="rounded-full bg-blue-600/20 px-2.5 py-1 text-xs font-semibold leading-5 text-blue-600 sm:text-sm" 
                      > 
                        默认 
                      </span>
                    )}
                  </div>
                </button>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Bot className="h-12 w-12 text-slate-400 mb-2" />
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {searchQuery ? "没有找到匹配的智能体" : "暂无可用智能体"}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* 用户组件 - 只在聊天记录视图中显示 */}
      {activeView === 'chats' && (
        <div className="w-full bg-white border-t border-slate-200 dark:border-slate-700">
          <div className="w-full px-3 py-4">
            <div className="flex items-center justify-between">
              <div className="flex">
                <div className="relative inline-flex">
                  <span
                    className="absolute bottom-0 right-0 h-3 w-3 rounded-full border bg-green-600 dark:border-slate-900 dark:bg-green-600"
                  ></span>
                  <img
                    src="/fastgpt.png"
                    alt="user"
                    className="h-10 w-10 rounded-full bg-white border-2 border-slate-200 dark:border-slate-700"
                  />
                </div>
                <div className="ml-3 flex flex-col justify-center">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-200">
                    John Doe
                  </h3>
                  <span className="text-xs text-slate-400">johndoe@gmail.com</span>
                </div>
              </div>
              <span
                className="rounded-full bg-green-600/10 px-2 py-0.5 text-xs font-semibold leading-4 text-green-600"
              >
                Free
              </span>
            </div>
            <button
              className="mt-4 w-full rounded-lg border border-slate-300 p-3 text-center text-sm font-medium text-slate-700 transition-colors duration-200 hover:bg-blue-600 hover:text-slate-50 focus:outline-none dark:border-slate-700 dark:text-slate-200"
              type="button"
            >
              ✨ 升级到专业版
            </button>
          </div>
        </div>
      )}
    </div>
  );
}