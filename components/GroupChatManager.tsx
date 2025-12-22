"use client";

import { useState } from "react";
import { GroupChatList } from "./GroupChatList";
import { GroupChatDetail } from "./GroupChatDetail";
import { CreateGroupChat } from "./CreateGroupChat";
import { GroupChat } from "@/types/chat";

type ViewMode = 'list' | 'detail';

interface GroupChatManagerProps {
  onGroupSelect?: (group: GroupChat) => void;
  onStartSingleGroupChat?: (group: GroupChat) => void;
}

export function GroupChatManager({ onGroupSelect, onStartSingleGroupChat }: GroupChatManagerProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedGroup, setSelectedGroup] = useState<GroupChat | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // 处理选择群聊
  const handleSelectGroup = (group: GroupChat) => {
    setSelectedGroup(group);
    setViewMode('detail');
    if (onGroupSelect) {
      onGroupSelect(group);
    }
  };

  // 处理返回列表
  const handleBackToList = () => {
    setSelectedGroup(null);
    setViewMode('list');
  };

  // 处理创建群聊
  const handleCreateGroup = async (groupData: {
    name: string;
    description: string;
    agentIds: string[];
    avatar?: string;
  }) => {
    try {
      const response = await fetch('/api/groupchats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(groupData),
      });

      const data = await response.json();

      if (data.success) {
        // 关闭创建弹窗
        setIsCreateModalOpen(false);
        
        // 如果当前在列表视图，刷新列表
        if (viewMode === 'list') {
          // 触发列表刷新
          window.dispatchEvent(new CustomEvent('refreshGroupList'));
        }
      } else {
        console.error('创建群聊失败:', data.error);
        alert('创建群聊失败: ' + data.error);
      }
    } catch (error) {
      console.error('创建群聊失败:', error);
      alert('创建群聊失败');
    }
  };

  // 处理更新群聊
  const handleUpdateGroup = (updatedGroup: GroupChat) => {
    setSelectedGroup(updatedGroup);
  };

  // 处理开始聊天
  const handleStartChat = (group: GroupChat) => {
    // 调用传入的回调函数，开始群聊
    if (onStartSingleGroupChat) {
      onStartSingleGroupChat(group);
    }
  };

  return (
    <div className="flex h-full">
      {/* 群聊列表 */}
      {viewMode === 'list' && (
        <GroupChatList
          onSelectGroup={handleSelectGroup}
          onCreateNewGroup={() => setIsCreateModalOpen(true)}
          selectedGroupId={selectedGroup?.id}
          onStartSingleGroupChat={onStartSingleGroupChat}
        />
      )}

      {/* 群聊详情 */}
      {viewMode === 'detail' && (
        <GroupChatDetail
          group={selectedGroup}
          onBack={handleBackToList}
          onUpdateGroup={handleUpdateGroup}
          onStartChat={handleStartChat}
        />
      )}

      {/* 创建群聊弹窗 */}
      <CreateGroupChat
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreateGroup={handleCreateGroup}
      />
    </div>
  );
}