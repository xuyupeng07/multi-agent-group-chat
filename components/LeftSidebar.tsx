"use client";

import { MessageSquare, Bot, Users, Settings, User, Plus } from "lucide-react";

interface LeftSidebarProps {
  activeView: 'chats' | 'agents' | 'groups';
  onViewChange: (view: 'chats' | 'agents' | 'groups') => void;
  onNewChat: () => void;
  onNewGroup?: () => void;
  onBackToChat?: () => void;
}

export function LeftSidebar({ activeView, onViewChange, onNewChat, onNewGroup, onBackToChat }: LeftSidebarProps) {
  return (
    <div className="flex h-screen w-12 flex-col items-center space-y-8 border-r border-slate-300 bg-slate-50 py-8 dark:border-slate-700 dark:bg-slate-900 sm:w-16">
      {/* Logo */}
      <div className="mb-1">
        <div className="h-7 w-7 rounded-lg bg-indigo-600 flex items-center justify-center">
          <MessageSquare className="h-4 w-4 text-white" />
        </div>
      </div>
      
      {/* New conversation */}
      <button
        onClick={onNewChat}
        className="rounded-lg p-1.5 text-slate-500 transition-colors duration-200 hover:bg-slate-200 focus:outline-none dark:text-slate-400 dark:hover:bg-slate-800"
        title="新建对话"
      >
        <Plus className="h-6 w-6" />
      </button>
      
      {/* Conversations */}
      <button
        onClick={() => {
          onViewChange('chats');
          onBackToChat?.();
        }}
        className={`rounded-lg p-1.5 transition-colors duration-200 ${
          activeView === 'chats'
            ? 'bg-blue-100 text-blue-600 dark:bg-slate-800 dark:text-blue-600'
            : 'text-slate-500 hover:bg-slate-200 focus:outline-none dark:text-slate-400 dark:hover:bg-slate-800'
        }`}
        title="聊天记录"
      >
        <MessageSquare className="h-6 w-6" />
      </button>
      
      {/* Agents */}
      <button
        onClick={() => onViewChange('agents')}
        className={`rounded-lg p-1.5 transition-colors duration-200 ${
          activeView === 'agents' 
            ? 'bg-blue-100 text-blue-600 dark:bg-slate-800 dark:text-blue-600' 
            : 'text-slate-500 hover:bg-slate-200 focus:outline-none dark:text-slate-400 dark:hover:bg-slate-800'
        }`}
        title="智能体"
      >
        <Bot className="h-6 w-6" />
      </button>
      
      {/* Group Chats */}
      <button
        onClick={() => onViewChange('groups')}
        className={`rounded-lg p-1.5 transition-colors duration-200 ${
          activeView === 'groups' 
            ? 'bg-blue-100 text-blue-600 dark:bg-slate-800 dark:text-blue-600' 
            : 'text-slate-500 hover:bg-slate-200 focus:outline-none dark:text-slate-400 dark:hover:bg-slate-800'
        }`}
        title="群聊"
      >
        <Users className="h-6 w-6" />
      </button>
      
      {/* User */}
      <button
        className="rounded-lg p-1.5 text-slate-500 transition-colors duration-200 hover:bg-slate-200 focus:outline-none dark:text-slate-400 dark:hover:bg-slate-800"
        title="用户"
      >
        <User className="h-6 w-6" />
      </button>
      
      {/* Settings */}
      <button
        className="rounded-lg p-1.5 text-slate-500 transition-colors duration-200 hover:bg-slate-200 focus:outline-none dark:text-slate-400 dark:hover:bg-slate-800"
        title="设置"
      >
        <Settings className="h-6 w-6" />
      </button>
    </div>
  );
}