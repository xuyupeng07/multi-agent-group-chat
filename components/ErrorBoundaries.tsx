"use client";

import React from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { MessageSquare } from 'lucide-react';

// 聊天组件的错误边界
export const ChatErrorBoundary = ({ children }: { children: React.ReactNode }) => (
  <ErrorBoundary
    fallback={
      <div className="flex-1 flex items-center justify-center bg-zinc-50 dark:bg-zinc-900">
        <div className="text-center p-6">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-red-100 dark:bg-red-900/20 rounded-full">
              <MessageSquare className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
          </div>
          <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-2">
            聊天界面出错
          </h3>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
            抱歉，聊天界面遇到了问题。请尝试刷新页面或开始新的对话。
          </p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            刷新页面
          </button>
        </div>
      </div>
    }
    onError={(error, errorInfo) => {
      console.error('聊天组件错误:', error, errorInfo);
      // 这里可以添加特定的错误报告逻辑
    }}
  >
    {children}
  </ErrorBoundary>
);

// 智能体列表的错误边界
export const AgentListErrorBoundary = ({ children }: { children: React.ReactNode }) => (
  <ErrorBoundary
    fallback={
      <div className="p-4 text-center">
        <div className="text-zinc-500 dark:text-zinc-400 mb-2">
          智能体列表加载失败
        </div>
        <button
          onClick={() => window.location.reload()}
          className="text-blue-600 hover:text-blue-700 text-sm"
        >
          重试
        </button>
      </div>
    }
    onError={(error, errorInfo) => {
      console.error('智能体列表错误:', error, errorInfo);
    }}
  >
    {children}
  </ErrorBoundary>
);

// 聊天输入组件的错误边界
export const ChatInputErrorBoundary = ({ children }: { children: React.ReactNode }) => (
  <ErrorBoundary
    fallback={
      <div className="border-t border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md p-4">
        <div className="text-center">
          <div className="text-zinc-500 dark:text-zinc-400 mb-2">
            输入框暂时不可用
          </div>
          <button
            onClick={() => window.location.reload()}
            className="text-blue-600 hover:text-blue-700 text-sm"
          >
            刷新页面
          </button>
        </div>
      </div>
    }
    onError={(error, errorInfo) => {
      console.error('聊天输入错误:', error, errorInfo);
    }}
  >
    {children}
  </ErrorBoundary>
);

// 智能体配置侧边栏的错误边界
export const AgentConfigErrorBoundary = ({ children }: { children: React.ReactNode }) => (
  <ErrorBoundary
    fallback={
      <div className="w-80 h-full bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 p-4">
        <div className="text-center">
          <div className="text-zinc-500 dark:text-zinc-400 mb-2">
            智能体配置加载失败
          </div>
          <button
            onClick={() => window.location.reload()}
            className="text-blue-600 hover:text-blue-700 text-sm"
          >
            刷新页面
          </button>
        </div>
      </div>
    }
    onError={(error, errorInfo) => {
      console.error('智能体配置错误:', error, errorInfo);
    }}
  >
    {children}
  </ErrorBoundary>
);