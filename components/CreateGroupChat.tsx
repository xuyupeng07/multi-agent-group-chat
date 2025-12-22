"use client";

import { useState, useEffect } from "react";
import { X, Users, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AvatarUpload } from "@/components/AvatarUpload";
import { Agent } from "@/types/chat";

interface CreateGroupChatProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateGroup: (groupData: {
    name: string;
    description: string;
    agentIds: string[];
    avatar?: string;
  }) => void;
}

export function CreateGroupChat({ isOpen, onClose, onCreateGroup }: CreateGroupChatProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [avatar, setAvatar] = useState("");
  const [availableAgents, setAvailableAgents] = useState<Agent[]>([]);
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // 获取可用的智能体列表
  const fetchAgents = async () => {
    try {
      const response = await fetch('/api/agents');
      const agents = await response.json();
      
      // 转换数据库中的智能体数据为前端需要的格式
      const formattedAgents = agents.map((agent: {
        _id: string;
        name: string;
        role: string;
        introduction: string;
        avatar: string;
        status: string;
        color: string;
      }) => ({
        id: agent._id.toString(), // 使用MongoDB的_id
        name: agent.name,
        role: agent.role,
        introduction: agent.introduction || '',
        avatar: agent.avatar || '',
        status: agent.status,
        color: agent.color
      }));
      
      setAvailableAgents(formattedAgents);
    } catch (error) {
      console.error('获取智能体列表失败:', error);
    }
  };

  // 组件挂载时获取智能体列表
  useEffect(() => {
    if (isOpen) {
      fetchAgents();
    }
  }, [isOpen]);

  // 重置表单
  const resetForm = () => {
    setName("");
    setDescription("");
    setAvatar("");
    setSelectedAgentIds([]);
  };

  // 关闭弹窗
  const handleClose = () => {
    resetForm();
    onClose();
  };

  // 添加/移除智能体
  const toggleAgentSelection = (agentId: string) => {
    setSelectedAgentIds(prev => {
      if (prev.includes(agentId)) {
        return prev.filter(id => id !== agentId);
      } else {
        return [...prev, agentId];
      }
    });
  };

  // 创建群聊
  const handleCreateGroup = () => {
    if (!name.trim()) {
      alert('请输入群聊名称');
      return;
    }

    if (selectedAgentIds.length === 0) {
      alert('请至少选择一个智能体');
      return;
    }

    onCreateGroup({
      name: name.trim(),
      description: description.trim(),
      agentIds: selectedAgentIds,
      avatar: avatar
    });

    resetForm();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50" onClick={handleClose}>
      {/* 右侧边栏 */}
      <div className="absolute top-0 right-0 h-full w-80 sm:w-96 bg-white dark:bg-slate-800 shadow-2xl flex flex-col pointer-events-auto" onClick={(e) => e.stopPropagation()}>
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-slate-600 dark:text-slate-400" />
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">创建新群聊</h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* 内容 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* 群聊头像 */}
          <div className="flex justify-center">
            <AvatarUpload 
              currentAvatar={avatar} 
              onAvatarChange={setAvatar}
            />
          </div>

          {/* 群聊名称 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              群聊名称 <span className="text-red-500">*</span>
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="输入群聊名称"
              className="w-full"
            />
          </div>

          {/* 群聊描述 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              群聊描述
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="输入群聊描述（可选）"
              className="w-full min-h-[100px] px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 resize-none"
            />
          </div>

          {/* 选择智能体 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              选择智能体 <span className="text-red-500">*</span>
            </label>
            <div className="space-y-2 max-h-80 overflow-y-auto border border-slate-200 dark:border-slate-600 rounded-md p-3">
              {availableAgents.length === 0 ? (
                <div className="text-center py-8 text-sm text-slate-500 dark:text-slate-400">
                  <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  暂无可用智能体
                </div>
              ) : (
                availableAgents.map((agent) => (
                  <div
                    key={agent.id}
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedAgentIds.includes(agent.id)
                        ? 'bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-700 border-2 border-transparent'
                    }`}
                    onClick={() => toggleAgentSelection(agent.id)}
                  >
                    <Avatar className="h-10 w-10 flex-shrink-0">
                      {agent.avatar && agent.avatar.trim() ? (
                        <AvatarImage src={agent.avatar} alt={agent.name} />
                      ) : null}
                      <AvatarFallback
                        style={{ backgroundColor: agent.color }}
                        className="text-white text-sm"
                      >
                        {agent.name?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                        {agent.name}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {agent.role}
                      </div>
                      {agent.introduction && (
                        <div className="text-xs text-slate-400 dark:text-slate-500 mt-1 line-clamp-2">
                          {agent.introduction}
                        </div>
                      )}
                    </div>
                    {selectedAgentIds.includes(agent.id) && (
                      <div className="h-6 w-6 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                        <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
            {selectedAgentIds.length > 0 && (
              <div className="mt-3 text-sm text-slate-600 dark:text-slate-400">
                已选择 {selectedAgentIds.length} 个智能体
              </div>
            )}
          </div>
        </div>

        {/* 底部操作栏 */}
        <div className="border-t border-slate-200 dark:border-slate-700 p-4">
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
              className="flex-1"
            >
              取消
            </Button>
            <Button
              onClick={handleCreateGroup}
              disabled={isLoading || !name.trim() || selectedAgentIds.length === 0}
              className="flex-1"
            >
              {isLoading ? '创建中...' : '创建群聊'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}