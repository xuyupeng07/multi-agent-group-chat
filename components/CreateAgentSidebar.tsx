"use client";

import { useState } from "react";
import { Agent } from "@/types/chat";
import { X, Save } from "lucide-react";
import { AvatarUpload } from "./AvatarUpload";

interface CreateAgentSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (agent: Agent) => void;
}

export function CreateAgentSidebar({ isOpen, onClose, onSave }: CreateAgentSidebarProps) {
  const [formData, setFormData] = useState<Partial<Agent>>({
    name: "",
    role: "",
    introduction: "",
    avatar: "",
    apiKey: "",
    status: "online",
    color: "bg-blue-500"
  });
  
  const [baseUrl, setBaseUrl] = useState("https://cloud.fastgpt.io/");
  const [maxTokens, setMaxTokens] = useState("2048");
  const [temperature, setTemperature] = useState("0.7");
  const [topP, setTopP] = useState("1");
  const [model, setModel] = useState("gpt-3.5-turbo");

  const handleSave = async () => {
    if (formData.name && formData.role) {
      try {
        // 准备请求数据，不需要提供id，MongoDB会自动生成
        const requestData = {
          name: formData.name,
          role: formData.role,
          introduction: formData.introduction || "",
          avatar: formData.avatar || "",
          apiKey: formData.apiKey || "",
          status: formData.status || "online",
          color: formData.color || "bg-blue-500",
          baseUrl: baseUrl || "https://cloud.fastgpt.io/"
        };
        
        console.log('Creating new agent with data:', requestData);
        
        // 调用API创建新智能体
        const response = await fetch('/api/agents', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestData),
        });

        if (!response.ok) {
          throw new Error('Failed to create agent');
        }

        const result = await response.json();
        console.log('智能体创建成功:', result);
        
        // 创建新的agent对象，使用MongoDB返回的_id作为id
        const newAgent: Agent = {
          id: result._id.toString(), // 使用MongoDB返回的_id
          name: formData.name,
          role: formData.role,
          introduction: formData.introduction || "",
          avatar: formData.avatar || "",
          apiKey: formData.apiKey,
          status: formData.status as "online" | "busy" | "offline",
          color: formData.color || "bg-blue-500",
          baseUrl: baseUrl
        };
        
        onSave(newAgent);
        
        // 重置表单
        setFormData({
          name: "",
          role: "",
          introduction: "",
          avatar: "",
          apiKey: "",
          status: "online",
          color: "bg-blue-500"
        });
        setBaseUrl("https://cloud.fastgpt.io/");
        setMaxTokens("2048");
        setTemperature("0.7");
        setTopP("1");
        setModel("gpt-3.5-turbo");
      } catch (error) {
        console.error('创建智能体时出错:', error);
        // 可以在这里添加错误提示
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50" onClick={onClose}>
      {/* 侧边栏 */}
      <div className="absolute right-0 top-0 h-full w-80 overflow-y-auto bg-white dark:bg-zinc-900 shadow-xl pointer-events-auto" onClick={(e) => e.stopPropagation()}>
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-700">
          <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
            创建智能体
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800 dark:text-zinc-400"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 配置表单 */}
        <div className="p-4 space-y-6">
          {/* 头像上传 */}
          <div className="flex justify-center">
            <AvatarUpload 
              currentAvatar={formData.avatar}
              onAvatarChange={(avatar) => setFormData({ ...formData, avatar })}
            />
          </div>
          
          {/* 基本信息 */}
          <div>
            <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-3">基本信息</h3>
            
            {/* 名称 */}
            <div className="mb-4">
              <label htmlFor="agent-name" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                名称
              </label>
              <input
                type="text"
                id="agent-name"
                className="block w-full rounded-lg border border-zinc-300 bg-white p-2.5 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-600 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                placeholder="输入智能体名称"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            
            {/* 角色 */}
            <div className="mb-4">
              <label htmlFor="agent-role" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                角色
              </label>
              <input
                type="text"
                id="agent-role"
                className="block w-full rounded-lg border border-zinc-300 bg-white p-2.5 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-600 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                placeholder="输入智能体角色"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              />
            </div>
            
            {/* 介绍 */}
            <div className="mb-4">
              <label htmlFor="agent-introduction" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                介绍
              </label>
              <textarea
                id="agent-introduction"
                rows={3}
                className="block w-full rounded-lg border border-zinc-300 bg-white p-2.5 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-600 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                placeholder="输入智能体介绍"
                value={formData.introduction || ''}
                onChange={(e) => setFormData({ ...formData, introduction: e.target.value })}
              />
            </div>
            
            {/* 颜色选择 */}
            <div className="mb-4">
              <label htmlFor="agent-color" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                颜色
              </label>
              <select
                id="agent-color"
                className="block w-full cursor-pointer rounded-lg border border-zinc-300 bg-white p-2.5 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-600 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
              >
                <option value="bg-blue-500">蓝色</option>
                <option value="bg-green-500">绿色</option>
                <option value="bg-purple-500">紫色</option>
                <option value="bg-red-500">红色</option>
                <option value="bg-yellow-500">黄色</option>
                <option value="bg-pink-500">粉色</option>
                <option value="bg-indigo-500">靛蓝</option>
                <option value="bg-gray-500">灰色</option>
              </select>
            </div>
            
            {/* 状态开关 */}
            <div className="mb-4">
              <label className="relative flex cursor-pointer items-center">
                <input 
                  type="checkbox" 
                  checked={formData.status === "online"}
                  onChange={(e) => setFormData({ ...formData, status: e.target.checked ? "online" : "offline" })}
                  className="peer sr-only" 
                />
                <div className="peer h-6 w-11 rounded-full bg-zinc-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-zinc-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 dark:border-zinc-600 dark:bg-zinc-700 dark:peer-focus:ring-blue-800"></div>
                <span className="ml-3 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  在线状态
                </span>
              </label>
            </div>
          </div>

          {/* API配置 */}
          <div>
            <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-3">API配置</h3>
            
            {/* API Key */}
            <div className="mb-4">
              <label htmlFor="api-key" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                API Key
              </label>
              <input
                type="password"
                id="api-key"
                className="block w-full rounded-lg border border-zinc-300 bg-white p-2.5 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-600 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                placeholder="输入API密钥"
                value={formData.apiKey}
                onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
              />
            </div>
            
            {/* Base URL */}
            <div className="mb-4">
              <label htmlFor="base-url" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Base URL
              </label>
              <input
                type="url"
                id="base-url"
                className="block w-full rounded-lg border border-zinc-300 bg-white p-2.5 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-600 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                placeholder="https://api.openai.com"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
              />
            </div>
            
            {/* 模型选择 */}
            <div className="mb-4">
              <label htmlFor="select-model" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                模型
              </label>
              <select
                id="select-model"
                className="block w-full cursor-pointer rounded-lg border border-zinc-300 bg-white p-2.5 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-600 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                value={model}
                onChange={(e) => setModel(e.target.value)}
              >
                <option value="gpt-3.5-turbo">gpt-3.5-turbo</option>
                <option value="gpt-4">gpt-4</option>
                <option value="gpt-4-0314">gpt-4-0314</option>
                <option value="gpt-4-32k">gpt-4-32k</option>
                <option value="gpt-4-32k-0314">gpt-4-32k-0314</option>
                <option value="gpt-3.5-turbo-0301">gpt-3.5-turbo-0301</option>
              </select>
            </div>
          </div>

          {/* 高级配置 */}
          <div>
            <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-3">高级配置</h3>
            
            {/* Max Tokens */}
            <div className="mb-4">
              <label htmlFor="max-tokens" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Max Tokens
              </label>
              <input
                type="number"
                id="max-tokens"
                className="block w-full rounded-lg border border-zinc-300 bg-white p-2.5 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-600 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                placeholder="2048"
                value={maxTokens}
                onChange={(e) => setMaxTokens(e.target.value)}
              />
            </div>
            
            {/* Temperature */}
            <div className="mb-4">
              <label htmlFor="temperature" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Temperature
              </label>
              <input
                type="number"
                id="temperature"
                className="block w-full rounded-lg border border-zinc-300 bg-white p-2.5 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-600 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                placeholder="0.7"
                value={temperature}
                onChange={(e) => setTemperature(e.target.value)}
              />
            </div>
            
            {/* Top P */}
            <div className="mb-4">
              <label htmlFor="top-p" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Top P
              </label>
              <input
                type="number"
                id="top-p"
                className="block w-full rounded-lg border border-zinc-300 bg-white p-2.5 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-600 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                placeholder="1"
                value={topP}
                onChange={(e) => setTopP(e.target.value)}
              />
            </div>
          </div>

          {/* 保存按钮 */}
          <button
            type="button"
            onClick={handleSave}
            className="flex w-full items-center justify-center rounded-lg bg-blue-600 p-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600"
          >
            <Save className="mr-2 h-4 w-4" />
            创建智能体
          </button>
        </div>
      </div>
    </div>
  );
}