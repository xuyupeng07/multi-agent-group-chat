"use client";

import { useState, useRef, useEffect } from "react";
import { Message, Agent, GroupChat } from "@/types/chat";
import { ChatHeader } from "./ChatHeader";
import { MessageList } from "./MessageList";
import { ChatInput } from "./ChatInput";
import { SuggestionBubbles } from "./SuggestionBubbles";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { Users, Plus, Settings, Phone, Video } from "lucide-react";
import { GroupChatDetail } from "./GroupChatDetail";
import { GroupChatList } from "./GroupChatList";

interface SingleGroupChatProps {
  group: GroupChat;
  agents: Agent[];
  onBack: () => void;
  onShowGroupDetail: (group: GroupChat) => void;
}

export function SingleGroupChat({ 
  group, 
  agents, 
  onBack, 
  onShowGroupDetail
}: SingleGroupChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showAgentList, setShowAgentList] = useState(false);
  const [mentionStartIndex, setMentionStartIndex] = useState<number | null>(null);
  const [filteredAgents, setFilteredAgents] = useState<Agent[]>([]);
  const [isComposing, setIsComposing] = useState(false);
  const [showGroupSidebar, setShowGroupSidebar] = useState<'detail' | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<{
    focus: () => void;
    setCursorPosition: (position: number) => void;
  }>(null);

  // 获取群聊中的智能体
  const getGroupAgents = () => {
    if (!group || !group.agentIds) return [];

    return group.agentIds.map(agentId => {
      // 如果agentId已经是Agent对象（通过populate获取），直接使用
      if (typeof agentId === 'object' && agentId !== null) {
        return agentId as Agent;
      }

      // 如果agentId是字符串，从agents数组中查找
      const agent = agents.find(a => a.id === agentId);
      return agent || {
        id: agentId,
        name: '未知智能体',
        role: '',
        introduction: '',
        avatar: '',
        status: 'offline' as const,
        color: '#6366f1'
      };
    });
  };

  // 清理effect - 组件卸载时重置状态
  useEffect(() => {
    return () => {
      // 组件卸载时重置所有状态
      setShowGroupSidebar(null);
      setIsLoading(false);
      setInputValue("");
      setShowAgentList(false);
      setMentionStartIndex(null);
      setFilteredAgents([]);
    };
  }, []);

  // 加载群聊历史消息
  useEffect(() => {
    const loadGroupChatMessages = async () => {
      try {
        const response = await fetch(`/api/groupchats/${group.id}/messages`);
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.messages) {
            setMessages(data.messages);
          }
        }
      } catch (error) {
        console.error('加载群聊消息失败:', error);
      }
    };

    if (group && group.id) {
      loadGroupChatMessages();
    }
  }, [group.id]);

  // Auto scroll to bottom when new messages are added
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        requestAnimationFrame(() => {
          scrollElement.scrollTop = scrollElement.scrollHeight;
        });
      }
    }
  }, [messages]);

  // 处理输入变化，检测@符号
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    
    // 检查是否有@符号
    const atIndex = newValue.lastIndexOf('@');
    
    if (atIndex !== -1) {
      // 检查@后面是否有空格，如果有则不显示列表
      const afterAt = newValue.substring(atIndex + 1);
      if (!afterAt.includes(' ')) {
        // 显示智能体列表
        setShowAgentList(true);
        setMentionStartIndex(atIndex);
        
        // 过滤群聊中的智能体
        const groupAgents = getGroupAgents();
        const searchTerm = afterAt.toLowerCase();
        const filtered = groupAgents.filter(agent =>
          agent.name.toLowerCase().includes(searchTerm)
        );
        setFilteredAgents(filtered);
      } else {
        setShowAgentList(false);
        setMentionStartIndex(null);
      }
    } else {
      setShowAgentList(false);
      setMentionStartIndex(null);
    }
  };

  // 处理发送消息
  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    const messageContent = inputValue;

    // 立即显示用户消息
    const userMessage: Message = {
      id: `temp_user_${Date.now()}`,
      agentName: "用户",
      agentColor: "bg-indigo-600",
      content: messageContent,
      timestamp: new Date().toISOString(),
      isUser: true,
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      // 调用群聊API
      const response = await fetch(`/api/groupchats/${group.id}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: messageContent,
          agentIds: getGroupAgents().map(agent => agent.id)
        }),
      });

      if (!response.ok) {
        throw new Error(`API错误: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success && data.messages && Array.isArray(data.messages)) {
        // 移除临时的用户消息，添加API返回的正式消息
        const newMessages: Message[] = data.messages.map((msg: any) => ({
          id: msg.id,
          agentName: msg.agentName,
          agentColor: msg.agentColor,
          content: msg.content,
          timestamp: msg.timestamp,
          isUser: msg.isUser,
        }));

        // 替换临时用户消息为正式消息，并添加AI回复
        setMessages(prev => {
          // 移除临时用户消息
          const filteredMessages = prev.filter(msg => msg.id !== userMessage.id);
          return [...filteredMessages, ...newMessages];
        });
      } else {
        throw new Error('API返回格式错误');
      }
    } catch (error) {
      console.error('发送消息失败:', error);

      // 移除临时用户消息并显示错误消息
      setMessages(prev => {
        const filteredMessages = prev.filter(msg => msg.id !== userMessage.id);
        return filteredMessages;
      });

      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        agentName: "系统",
        agentColor: "bg-red-500",
        content: `发送消息失败: ${error instanceof Error ? error.message : '未知错误'}`,
        timestamp: new Date().toISOString(),
        isUser: false,
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Escape" && showAgentList) {
      setShowAgentList(false);
      setMentionStartIndex(null);
      return;
    }
    
    if (e.key === "Enter" && !e.shiftKey && !isComposing && !showAgentList) {
      e.preventDefault();
      handleSend();
    }
  };

  // 选择智能体
  const selectAgent = (agentName: string) => {
    if (mentionStartIndex !== null) {
      const beforeMention = inputValue.substring(0, mentionStartIndex);
      const newValue = `${beforeMention}@${agentName} `;
      setInputValue(newValue);
      setShowAgentList(false);
      setMentionStartIndex(null);
      
      setTimeout(() => {
        if (chatInputRef.current) {
          const cursorPosition = newValue.length;
          chatInputRef.current.setCursorPosition(cursorPosition);
        }
      }, 0);
    }
  };

  // 处理显示群聊详情
  const handleShowGroupDetail = () => {
    if (group) {
      setShowGroupSidebar('detail');
      onShowGroupDetail(group);
    }
  };

  // 处理侧边栏返回
  const handleSidebarBack = () => {
    setShowGroupSidebar(null);
  };

  return (
    <div className="flex-1 flex flex-col bg-white dark:bg-zinc-950 relative">
      {/* 群聊头部 */}
    <div className="h-16 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between px-6 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md sticky top-0 z-10">
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10">
          {group.avatar && group.avatar.trim() ? (
            <AvatarImage src={group.avatar} alt={group.name} className="object-cover object-center p-1" />
          ) : null}
          <AvatarFallback className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
            <Users className="h-5 w-5" />
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col">
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">{group.name}</h2>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs text-zinc-500">{getGroupAgents().length} agents active</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="text-zinc-500">
          <Phone className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" className="text-zinc-500">
          <Video className="h-5 w-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="text-zinc-500"
          onClick={handleShowGroupDetail}
          title="群聊详情"
        >
          <Settings className="h-5 w-5" />
        </Button>
      </div>
    </div>

      {/* 消息列表 */}
      <MessageList messages={messages} scrollAreaRef={scrollAreaRef} agents={getGroupAgents()} />

      {/* 建议气泡 */}
      <SuggestionBubbles 
        onSuggestionClick={(suggestion) => {
          setInputValue(suggestion);
          setTimeout(() => {
            if (chatInputRef.current) {
              chatInputRef.current.focus();
              chatInputRef.current.setCursorPosition(suggestion.length);
            }
          }, 100);
        }} 
      />

      {/* 输入框 */}
      <ChatInput
        ref={chatInputRef}
        inputValue={inputValue}
        isLoading={isLoading}
        isComposing={isComposing}
        showAgentList={showAgentList}
        filteredAgents={filteredAgents}
        mentionStartIndex={mentionStartIndex}
        isDiscussionMode={false}
        discussionPaused={false}
        discussionCompleted={false}
        discussionWaitingForInput={false}
        onPauseDiscussion={() => {}}
        onResumeDiscussion={() => {}}
        onInputChange={handleInputChange}
        onSend={handleSend}
        onKeyDown={handleKeyDown}
        onCompositionStart={() => setIsComposing(true)}
        onCompositionEnd={() => setIsComposing(false)}
        onSelectAgent={selectAgent}
      />

      {/* 群聊侧边栏 */}
      {showGroupSidebar && (
        <div className="absolute top-0 right-0 h-full w-52 sm:w-60 bg-slate-50 dark:bg-slate-900 z-10 shadow-lg">
          {showGroupSidebar === 'detail' && (
            <div className="h-full">
              <GroupChatDetail
                group={group}
                onBack={handleSidebarBack}
                onUpdateGroup={() => {}}
                onStartChat={() => {}}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}