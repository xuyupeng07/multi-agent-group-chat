"use client";

import { useState, useRef, useEffect } from "react";
import { Message, Agent, GroupChat } from "@/types/chat";
import { ChatHeader } from "./ChatHeader";
import { MessageList } from "./MessageList";
import { ChatInput } from "./ChatInput";
import { SuggestionBubbles } from "./SuggestionBubbles";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { ArrowLeft, Users, Plus, Settings } from "lucide-react";
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
    
    // 添加用户消息
    const userMessage: Message = {
      id: Date.now().toString(),
      agentName: "用户",
      agentColor: "bg-indigo-600",
      content: inputValue,
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
          message: inputValue,
          agentIds: getGroupAgents().map(agent => agent.id)
        }),
      });
      
      if (!response.ok) {
        throw new Error(`API错误: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.messages && Array.isArray(data.messages)) {
        // 添加智能体回复消息
        const agentMessages: Message[] = data.messages.map((msg: any) => ({
          id: msg.id,
          agentName: msg.agentName,
          agentColor: msg.agentColor,
          content: msg.content,
          timestamp: msg.timestamp,
          isUser: false,
        }));
        
        setMessages(prev => [...prev, ...agentMessages]);
      } else {
        throw new Error('API返回格式错误');
      }
    } catch (error) {
      console.error('发送消息失败:', error);
      
      // 如果API调用失败，显示错误消息
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
      <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="h-8 w-8 p-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Avatar className="h-8 w-8">
            <AvatarImage src={group.avatar} alt={group.name} />
            <AvatarFallback className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
              <Users className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">{group.name}</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {getGroupAgents().length} 个智能体
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleShowGroupDetail}
            className="h-8 w-8 p-0"
            title="群聊详情"
          >
            <Settings className="h-4 w-4" />
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