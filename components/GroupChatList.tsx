"use client";

import { useState, useEffect } from "react";
import { Users, Plus, Trash2, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { GroupChat, Agent } from "@/types/chat";

interface GroupChatListProps {
  onSelectGroup: (group: GroupChat) => void;
  onCreateNewGroup: () => void;
  selectedGroupId?: string;
  onStartSingleGroupChat?: (group: GroupChat) => void;
}

export function GroupChatList({ onSelectGroup, onCreateNewGroup, selectedGroupId, onStartSingleGroupChat }: GroupChatListProps) {
  const [groupChats, setGroupChats] = useState<GroupChat[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 获取群聊列表
  const fetchGroupChats = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/groupchats');
      const data = await response.json();
      
      if (data.success) {
        setGroupChats(data.data);
      } else {
        console.error('获取群聊列表失败:', data.error);
      }
    } catch (error) {
      console.error('获取群聊列表失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 删除群聊
  const handleDeleteGroup = async (groupId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    
    if (!confirm('确定要删除这个群聊吗？')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/groupchats/${groupId}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (data.success) {
        // 刷新群聊列表
        fetchGroupChats();
      } else {
        console.error('删除群聊失败:', data.error);
        alert('删除群聊失败: ' + data.error);
      }
    } catch (error) {
      console.error('删除群聊失败:', error);
      alert('删除群聊失败');
    }
  };

  // 组件挂载时获取群聊列表
          useEffect(() => {
            fetchGroupChats();
            
            // 监听刷新事件
            const handleRefresh = () => {
              fetchGroupChats();
            };
            
            window.addEventListener('refreshGroupList', handleRefresh);
            
            return () => {
              window.removeEventListener('refreshGroupList', handleRefresh);
            };
          }, []);

  return (
    <div className="h-screen w-52 flex flex-col bg-slate-50 dark:bg-slate-900 sm:w-60">
      {/* 头部 */}
      <div className="flex items-center justify-between px-5 py-8">
        <div className="flex items-center">
          <h2 className="inline text-lg font-medium text-slate-800 dark:text-slate-200">
            群聊
          </h2>
          <span className="ml-2 rounded-full bg-blue-600 px-2 py-1 text-xs text-slate-200">
            {groupChats.length}
          </span>
        </div>
        <Button
          onClick={onCreateNewGroup}
          variant="ghost"
          size="sm"
          className="rounded-lg p-1.5 text-slate-500 transition-colors duration-200 hover:bg-slate-200 focus:outline-none dark:text-slate-400 dark:hover:bg-slate-800"
          title="新建群聊"
        >
          <Plus className="h-5 w-5" />
        </Button>
      </div>

      {/* 群聊列表 */}
      <div className="flex-1 overflow-y-auto mx-2 space-y-2 scrollbar-hide">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          </div>
        ) : groupChats.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Users className="h-12 w-12 text-slate-400 mb-2" />
            <p className="text-sm text-slate-500 dark:text-slate-400">
              还没有群聊
            </p>
            <Button
              onClick={onCreateNewGroup}
              variant="ghost"
              size="sm"
              className="mt-2 text-blue-600 hover:text-blue-700"
            >
              创建群聊
            </Button>
          </div>
        ) : (
          groupChats.map((group) => (
            <div
              key={group.id}
              className={`relative group cursor-pointer rounded-lg px-3 py-2 text-left transition-colors duration-200 ${
                selectedGroupId === group.id
                  ? 'bg-slate-200 dark:bg-slate-800'
                  : 'hover:bg-slate-200 dark:hover:bg-slate-800'
              }`}
              onClick={() => onSelectGroup(group)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarImage src={group.avatar} alt={group.name} />
                    <AvatarFallback className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                      <Users className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
                      {group.name}
                    </h3>
                    {group.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-1">
                        {group.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex -space-x-1">
                        {group.agentIds && group.agentIds.length > 0 && (
                          // 显示前3个智能体头像
                          group.agentIds.slice(0, 3).map((agentOrId: any, index: number) => {
                            // 如果agentOrId已经是Agent对象（通过populate获取），直接使用
                            const agent = typeof agentOrId === 'object' && agentOrId !== null 
                              ? agentOrId as Agent
                              // 否则创建一个基本的Agent对象用于显示
                              : {
                                  id: agentOrId,
                                  name: '未知',
                                  color: '#6366f1',
                                  avatar: ''
                                } as Agent;
                            
                            return (
                              <Avatar key={`${group.id}-agent-${agent.id || `agent-${index}`}`} className="h-4 w-4 border border-white dark:border-slate-800">
                                <AvatarImage src={agent.avatar} alt={agent.name} />
                                <AvatarFallback 
                                  className="text-xs" 
                                  style={{ backgroundColor: agent.color }}
                                >
                                  {agent.name?.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                            );
                          })
                        )}
                        {group.agentIds && group.agentIds.length > 3 && (
                          <div className="h-4 w-4 rounded-full bg-slate-200 dark:bg-slate-700 border border-white dark:border-slate-800 flex items-center justify-center">
                            <span className="text-xs text-slate-600 dark:text-slate-300">
                              +{group.agentIds.length - 3}
                            </span>
                          </div>
                        )}
                      </div>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {group.agentIds?.length || 0} 个智能体
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {onStartSingleGroupChat && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 flex-shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        onStartSingleGroupChat(group);
                      }}
                      title="开始群聊"
                    >
                      <MessageSquare className="h-3 w-3" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex-shrink-0"
                    onClick={(e) => handleDeleteGroup(group.id, e)}
                    title="删除群聊"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}