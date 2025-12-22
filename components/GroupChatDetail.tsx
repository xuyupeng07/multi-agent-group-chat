"use client";

import { useState, useEffect } from "react";
import { Users, Edit, Trash2, Plus, MessageSquare, Settings, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AvatarUpload } from "@/components/AvatarUpload";
import { GroupChat, Agent } from "@/types/chat";
import { CreateGroupChat } from "./CreateGroupChat";

interface GroupChatDetailProps {
  group: GroupChat | null;
  onBack: () => void;
  onUpdateGroup: (updatedGroup: GroupChat) => void;
  onStartChat: (group: GroupChat) => void;
}

export function GroupChatDetail({ group, onBack, onUpdateGroup, onStartChat }: GroupChatDetailProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [showAddAgentModal, setShowAddAgentModal] = useState(false);
  const [availableAgents, setAvailableAgents] = useState<Agent[]>([]);
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([]);
  const [isEditingAvatar, setIsEditingAvatar] = useState(false);
  const [isEditingGroupInfo, setIsEditingGroupInfo] = useState(false);
  const [tempAvatar, setTempAvatar] = useState("");
  const [tempName, setTempName] = useState("");
  const [tempDescription, setTempDescription] = useState("");

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
      
      // 过滤掉已经在群聊中的智能体
      const currentAgentIds = group?.agentIds?.map((agentOrId: any) => {
        // 如果agentOrId已经是Agent对象（通过populate获取），使用其id
        if (typeof agentOrId === 'object' && agentOrId !== null) {
          return agentOrId.id;
        }
        // 否则它本身就是ID字符串
        return agentOrId;
      }) || [];
      const filteredAgents = formattedAgents.filter((agent: Agent) => !currentAgentIds.includes(agent.id));
      
      setAvailableAgents(filteredAgents);
    } catch (error) {
      console.error('获取智能体列表失败:', error);
    }
  };

  // 组件挂载时获取智能体列表
  useEffect(() => {
    if (group) {
      fetchAgents();
      setTempAvatar(group.avatar || "");
      setTempName(group.name || "");
      setTempDescription(group.description || "");
    }
  }, [group]);

  // 更新群聊头像
  const handleUpdateAvatar = async () => {
    if (!group) return;
    
    try {
      const response = await fetch('/api/groupchats/update-avatar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          groupId: group.id,
          avatar: tempAvatar
        }),
      });
      
      const data = await response.json();
      
      if (data.message === '群聊头像更新成功') {
        // 更新本地群聊数据
        const updatedGroup = {
          ...group,
          avatar: tempAvatar
        };
        onUpdateGroup(updatedGroup);
        setIsEditingAvatar(false);
      } else {
        console.error('更新群聊头像失败:', data.error);
        alert('更新群聊头像失败: ' + data.error);
      }
    } catch (error) {
      console.error('更新群聊头像失败:', error);
      alert('更新群聊头像失败');
    }
  };

  // 更新群信息
  const handleUpdateGroupInfo = async () => {
    if (!group) return;
    
    if (!tempName.trim()) {
      alert('群聊名称不能为空');
      return;
    }
    
    try {
      const response = await fetch(`/api/groupchats/${group.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: tempName.trim(),
          description: tempDescription.trim(),
          avatar: tempAvatar
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        // 更新本地群聊数据
        const updatedGroup = {
          ...group,
          name: tempName.trim(),
          description: tempDescription.trim(),
          avatar: tempAvatar
        };
        onUpdateGroup(updatedGroup);
        setIsEditingGroupInfo(false);
      } else {
        console.error('更新群信息失败:', data.error);
        alert('更新群信息失败: ' + data.error);
      }
    } catch (error) {
      console.error('更新群信息失败:', error);
      alert('更新群信息失败');
    }
  };

  // 取消头像编辑
  const handleCancelAvatarEdit = () => {
    setTempAvatar(group?.avatar || "");
    setIsEditingAvatar(false);
  };

  // 取消群信息编辑
  const handleCancelGroupInfoEdit = () => {
    setTempAvatar(group?.avatar || "");
    setTempName(group?.name || "");
    setTempDescription(group?.description || "");
    setIsEditingGroupInfo(false);
  };

  // 删除群聊中的智能体
  const handleRemoveAgent = async (agentId: string) => {
    if (!group) return;
    
    if (!confirm('确定要将这个智能体从群聊中移除吗？')) {
      return;
    }
    
    try {
      const currentAgentIds = group.agentIds?.map((agentOrId: any) => {
        // 如果agentOrId已经是Agent对象（通过populate获取），使用其id
        if (typeof agentOrId === 'object' && agentOrId !== null) {
          return agentOrId.id;
        }
        // 否则它本身就是ID字符串
        return agentOrId;
      }) || [];
      const updatedAgentIds = currentAgentIds.filter((id: string) => id !== agentId);
      
      const response = await fetch(`/api/groupchats/${group.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agentIds: updatedAgentIds
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        // 更新本地群聊数据
        const updatedGroup = {
          ...group,
          agentIds: updatedAgentIds
        };
        onUpdateGroup(updatedGroup);
      } else {
        console.error('移除智能体失败:', data.error);
        alert('移除智能体失败: ' + data.error);
      }
    } catch (error) {
      console.error('移除智能体失败:', error);
      alert('移除智能体失败');
    }
  };

  // 添加智能体到群聊
  const handleAddAgents = async () => {
    if (!group || selectedAgentIds.length === 0) return;
    
    try {
      const currentAgentIds = group.agentIds?.map((agentOrId: any) => {
        // 如果agentOrId已经是Agent对象（通过populate获取），使用其id
        if (typeof agentOrId === 'object' && agentOrId !== null) {
          return agentOrId.id;
        }
        // 否则它本身就是ID字符串
        return agentOrId;
      }) || [];
      const updatedAgentIds = [...currentAgentIds, ...selectedAgentIds];
      
      const response = await fetch(`/api/groupchats/${group.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agentIds: updatedAgentIds
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        // 更新本地群聊数据
        const updatedGroup = {
          ...group,
          agentIds: data.data.agentIds
        };
        onUpdateGroup(updatedGroup);
        setShowAddAgentModal(false);
        setSelectedAgentIds([]);
      } else {
        console.error('添加智能体失败:', data.error);
        alert('添加智能体失败: ' + data.error);
      }
    } catch (error) {
      console.error('添加智能体失败:', error);
      alert('添加智能体失败');
    }
  };

  // 打开添加智能体侧边栏时关闭其他侧边栏
  const handleOpenAddAgentModal = () => {
    setIsEditingGroupInfo(false);
    setShowAddAgentModal(true);
  };

  // 打开编辑群信息侧边栏时关闭其他侧边栏
  const handleOpenEditGroupInfo = () => {
    setShowAddAgentModal(false);
    setIsEditingGroupInfo(true);
  };

  // 删除群聊
  const handleDeleteGroup = async () => {
    if (!group) return;
    
    if (!confirm(`确定要删除群聊"${group.name}"吗？此操作不可恢复。`)) {
      return;
    }
    
    try {
      const response = await fetch(`/api/groupchats/${group.id}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (data.success) {
        onBack(); // 返回群聊列表
      } else {
        console.error('删除群聊失败:', data.error);
        alert('删除群聊失败: ' + data.error);
      }
    } catch (error) {
      console.error('删除群聊失败:', error);
      alert('删除群聊失败');
    }
  };

  if (!group) {
    return (
      <div className="h-screen w-52 flex flex-col bg-slate-50 dark:bg-slate-900 sm:w-60">
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="text-center px-5">
            <Users className="h-12 w-12 text-slate-400 mx-auto mb-3" />
            <div className="text-sm text-slate-500 dark:text-slate-400">选择一个群聊查看详情</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-52 flex flex-col bg-slate-50 dark:bg-slate-900 sm:w-60 border-r border-slate-200 dark:border-slate-700">
      {/* 头部 - 紧凑布局 */}
      <div className="flex items-center px-4 py-3 border-b border-slate-200 dark:border-slate-700">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="h-8 w-8 p-0 text-slate-500 transition-colors duration-200 hover:bg-slate-200 focus:outline-none dark:text-slate-400 dark:hover:bg-slate-800"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="ml-2">
          <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">群聊详情</h3>
        </div>
      </div>

      {/* 群聊描述 - 如果有则显示 */}
      {group.description && (
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
          <div className="text-xs text-slate-600 dark:text-slate-400">
            {group.description}
          </div>
        </div>
      )}

      {/* 操作按钮 - 紧凑布局 */}
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
        <div className="flex flex-col gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleOpenEditGroupInfo}
            className="justify-start h-8 px-3 rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors duration-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            <Edit className="h-4 w-4 mr-2" />
            <span className="text-xs">编辑群信息</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleOpenAddAgentModal}
            className="justify-start h-8 px-3 rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors duration-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            <span className="text-xs">添加智能体</span>
          </Button>
        </div>
      </div>

      {/* 智能体列表标题 */}
      <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-700">
        <h4 className="text-xs font-medium text-slate-500 dark:text-slate-400">
          智能体列表 ({group.agentIds?.length || 0})
        </h4>
      </div>

      {/* 智能体列表 */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1 scrollbar-hide">
        {group.agentIds && group.agentIds.length > 0 ? (
          group.agentIds.map((agentOrId: any, index: number) => {
            // 如果agentOrId已经是Agent对象（通过populate获取），直接使用
            const agent = typeof agentOrId === 'object' && agentOrId !== null 
              ? agentOrId as Agent
              // 否则创建一个基本的Agent对象用于显示
              : {
                  id: agentOrId,
                  name: '未知智能体',
                  role: '',
                  introduction: '',
                  avatar: '',
                  status: 'offline' as const,
                  color: '#6366f1'
                } as Agent;
            
            return (
              <div
                key={`${agent.id}-${index}`}
                className="relative group cursor-pointer rounded-md px-2 py-1.5 text-left transition-colors duration-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <Avatar className="h-7 w-7 flex-shrink-0">
                    {agent.avatar && agent.avatar.trim() ? (
                      <AvatarImage src={agent.avatar} alt={agent.name} />
                    ) : null}
                    <AvatarFallback
                      className="text-xs"
                      style={{ backgroundColor: agent.color }}
                    >
                      {agent.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate">
                      {agent.name}
                    </h3>
                    {agent.role && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {agent.role}
                      </p>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex-shrink-0"
                  onClick={() => handleRemoveAgent(agent.id)}
                  title="移除智能体"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <Users className="h-8 w-8 text-slate-400 mb-2" />
            <p className="text-xs text-slate-500 dark:text-slate-400">
              这个群聊还没有智能体
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleOpenAddAgentModal}
              className="mt-2 text-xs h-7 px-3 rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors duration-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              <Plus className="h-3 w-3 mr-1" />
              添加智能体
            </Button>
          </div>
        )}
      </div>

      {/* 删除群聊按钮 */}
      <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDeleteGroup}
          className="w-full justify-start h-8 px-3 rounded-md text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors duration-200"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          <span className="text-xs">删除群聊</span>
        </Button>
      </div>

      {/* 添加智能体右侧边栏 - 带点击外部关闭功能 */}
      {showAddAgentModal && (
        <div className="fixed inset-0 z-50" onClick={() => {
          setShowAddAgentModal(false);
          setSelectedAgentIds([]);
        }}>
          {/* 右侧边栏 */}
          <div className="absolute top-0 right-0 h-full w-80 sm:w-96 bg-white dark:bg-slate-800 shadow-2xl flex flex-col pointer-events-auto" onClick={(e) => e.stopPropagation()}>
            {/* 头部 */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">添加智能体到群聊</h2>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowAddAgentModal(false);
                  setSelectedAgentIds([]);
                }}
                className="h-8 w-8 p-0"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </Button>
            </div>

            {/* 智能体列表 */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-2">
                {availableAgents.length === 0 ? (
                  <div className="text-center py-8 text-sm text-slate-500 dark:text-slate-400">
                    <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    没有可添加的智能体
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
                      onClick={() => {
                        setSelectedAgentIds(prev => {
                          if (prev.includes(agent.id)) {
                            return prev.filter(id => id !== agent.id);
                          } else {
                            return [...prev, agent.id];
                          }
                        });
                      }}
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
            </div>

            {/* 底部操作栏 */}
            <div className="border-t border-slate-200 dark:border-slate-700 p-4">
              {selectedAgentIds.length > 0 && (
                <div className="mb-3 text-sm text-slate-600 dark:text-slate-400">
                  已选择 {selectedAgentIds.length} 个智能体
                </div>
              )}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAddAgentModal(false);
                    setSelectedAgentIds([]);
                  }}
                  className="flex-1"
                >
                  取消
                </Button>
                <Button
                  onClick={handleAddAgents}
                  disabled={selectedAgentIds.length === 0}
                  className="flex-1"
                >
                  添加 {selectedAgentIds.length > 0 && `(${selectedAgentIds.length})`}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 编辑群信息右侧边栏 - 带点击外部关闭功能 */}
      {isEditingGroupInfo && (
        <div className="fixed inset-0 z-50" onClick={handleCancelGroupInfoEdit}>
          {/* 右侧边栏 */}
          <div className="absolute top-0 right-0 h-full w-80 sm:w-96 bg-white dark:bg-slate-800 shadow-2xl flex flex-col pointer-events-auto" onClick={(e) => e.stopPropagation()}>
            {/* 头部 */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <Edit className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">编辑群信息</h2>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancelGroupInfoEdit}
                className="h-8 w-8 p-0"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </Button>
            </div>

            {/* 内容 */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {/* 群聊头像 */}
              <div className="flex justify-center">
                <AvatarUpload 
                  currentAvatar={tempAvatar} 
                  onAvatarChange={setTempAvatar}
                />
              </div>

              {/* 群聊名称 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  群聊名称 <span className="text-red-500">*</span>
                </label>
                <Input
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
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
                  value={tempDescription}
                  onChange={(e) => setTempDescription(e.target.value)}
                  placeholder="输入群聊描述（可选）"
                  className="w-full min-h-[100px] px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 resize-none"
                />
              </div>
            </div>

            {/* 底部操作栏 */}
            <div className="border-t border-slate-200 dark:border-slate-700 p-4">
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={handleCancelGroupInfoEdit}
                  className="flex-1"
                >
                  取消
                </Button>
                <Button
                  onClick={handleUpdateGroupInfo}
                  disabled={!tempName.trim()}
                  className="flex-1"
                >
                  保存
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}