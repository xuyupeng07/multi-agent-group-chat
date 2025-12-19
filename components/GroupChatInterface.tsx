"use client";

import { useState, useRef, useEffect } from "react";
import { Message, Agent, GroupChat } from "@/types/chat";
import { ChatHeader } from "./ChatHeader";
import { MessageList } from "./MessageList";
import { ChatInput } from "./ChatInput";
import { SuggestionBubbles } from "./SuggestionBubbles";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { ArrowLeft, Users, Plus, Settings, MessageSquare, MessageSquareOff } from "lucide-react";
import { GroupChatDetail } from "./GroupChatDetail";
import { GroupChatList } from "./GroupChatList";
import { callFastGPT, FastGPTMessage, getAgentApiKey } from "@/lib/fastgpt";

interface GroupChatInterfaceProps {
  group: GroupChat | null;
  agents: Agent[];
  onBack: () => void;
  onShowGroupDetail: (group: GroupChat) => void;
  onShowGroupList: () => void;
}

export function GroupChatInterface({ 
  group, 
  agents, 
  onBack, 
  onShowGroupDetail,
  onShowGroupList 
}: GroupChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showAgentList, setShowAgentList] = useState(false);
  const [mentionStartIndex, setMentionStartIndex] = useState<number | null>(null);
  const [filteredAgents, setFilteredAgents] = useState<Agent[]>([]);
  const [isComposing, setIsComposing] = useState(false);
  const [showGroupSidebar, setShowGroupSidebar] = useState<'list' | 'detail' | null>(null);
  
  // 讨论状态管理
  const [isDiscussionMode, setIsDiscussionMode] = useState(false);
  const [discussionPaused, setDiscussionPaused] = useState(false);
  const [discussionCompleted, setDiscussionCompleted] = useState(false);
  const [discussionWaitingForInput, setDiscussionWaitingForInput] = useState(false);
  const [discussionRounds] = useState(3); // 默认讨论轮数
  const [currentRound, setCurrentRound] = useState(0);
  const [currentStreamingMessageId, setCurrentStreamingMessageId] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  
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

  // 处理讨论模式的函数
  const handleDiscussionMode = async (messageContent: string) => {
    // 重置讨论状态
    setIsDiscussionMode(true);
    setDiscussionPaused(false);
    setDiscussionCompleted(false);
    setDiscussionWaitingForInput(false);
    setCurrentRound(0);
    
    // 重置 AbortController
    abortControllerRef.current = null;
    
    // 添加用户消息
    const userMessage: Message = {
      id: Date.now().toString(),
      agentName: "用户",
      agentColor: "bg-indigo-600",
      content: messageContent,
      timestamp: new Date().toISOString(),
      isUser: true,
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);
    
    // 准备发送给调度中心的消息历史
    const fastgptMessages: FastGPTMessage[] = [
      {
        role: 'user',
        content: messageContent
      }
    ];
    
    try {
      console.log('群聊讨论模式：准备开始讨论...');
      
      // 创建调度中心思考中的消息
      const dispatchMessageId = (Date.now() + 1).toString();
      const dispatchMessage: Message = {
        id: dispatchMessageId,
        agentName: "调度中心",
        agentColor: "bg-gray-500",
        content: `准备开始讨论（共${discussionRounds}轮）...`,
        timestamp: new Date().toISOString(),
        isUser: false,
      };
      
      setMessages(prev => [...prev, dispatchMessage]);
      
      // 开始依次调用智能体进行讨论
      await startDiscussionWithAgents(fastgptMessages);
      
    } catch (error) {
      // 如果是中止错误，不显示错误消息
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('讨论模式请求被中止');
        setIsLoading(false);
        return;
      }
      
      console.error('讨论模式错误:', error);
      
      // 更新调度中心消息，显示错误信息
      const errorMessage = `讨论模式启动失败：${error instanceof Error ? error.message : '未知错误'}`;
      setMessages(prev => {
        // 查找最近的调度中心消息
        const dispatchMsg = prev.slice().reverse().find(msg => msg.agentName === "调度中心");
        if (dispatchMsg) {
          return prev.map(msg => 
            msg.id === dispatchMsg.id 
              ? { ...msg, content: errorMessage }
              : msg
          );
        } else {
          // 如果没有找到调度中心消息，添加一个新的错误消息
          const errorMsg: Message = {
            id: (Date.now() + 1).toString(),
            agentName: "系统",
            agentColor: "bg-red-500",
            content: errorMessage,
            timestamp: new Date().toISOString(),
            isUser: false,
          };
          return [...prev, errorMsg];
        }
      });
      
      setIsLoading(false);
    }
  };

  // 开始与智能体进行讨论
  const startDiscussionWithAgents = async (initialMessages: FastGPTMessage[]) => {
    // 创建新的 AbortController
    abortControllerRef.current = new AbortController();
    
    let currentMessages = [...initialMessages];
    let round = 1;
    
    // 持续进行讨论，直到达到指定的轮数
    while (round <= discussionRounds) {
      // 在每次循环开始时检查暂停状态
      if (discussionPaused) {
        console.log('讨论已被暂停，停止后续轮次');
        const pauseMessage: Message = {
          id: (Date.now() + 1).toString(),
          agentName: "调度中心",
          agentColor: "bg-gray-500",
          content: `讨论已暂停（第${round}/${discussionRounds}轮），点击继续讨论按钮可恢复`,
          timestamp: new Date().toISOString(),
          isUser: false,
        };
        
        setMessages(prev => [...prev, pauseMessage]);
        return;
      }
      
      // 检查是否已被中止
      if (abortControllerRef.current?.signal.aborted) {
        console.log('讨论已被中止');
        setIsLoading(false);
        return;
      }
      
      // 更新当前轮数
      setCurrentRound(round);
      
      try {
        // 调用群聊API获取选中的智能体
        const response = await fetch(`/api/groupchats/${group?.id}/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: currentMessages[currentMessages.length - 1].content,
            agentIds: getGroupAgents().map(agent => agent.id),
            discuss: true // 开启讨论模式
          }),
        });
        
        if (!response.ok) {
          throw new Error(`API错误: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.success && data.discussionMode && data.selectedAgent) {
          const selectedAgent = data.selectedAgent;
          
          // 添加调度中心消息，显示选择的智能体
          const dispatchMessageId = (Date.now() + 1).toString();
          const dispatchMessage: Message = {
            id: dispatchMessageId,
            agentName: "调度中心",
            agentColor: "bg-gray-500",
            content: `第${round}轮讨论：选择智能体 ${selectedAgent.name} 参与讨论`,
            timestamp: new Date().toISOString(),
            isUser: false,
          };
          
          setMessages(prev => [...prev, dispatchMessage]);
          
          // 获取智能体配置
          let agentConfig = getGroupAgents().find(agent => agent.name === selectedAgent.name);
          
          // 如果是默认智能体，创建一个临时配置
        if (!agentConfig && selectedAgent.name === '默认智能体') {
          agentConfig = {
            id: selectedAgent.id,
            name: selectedAgent.name,
            role: 'assistant', // 添加缺失的role属性
            color: 'bg-blue-500',
            avatar: '',
            status: 'online' as const,
            introduction: '默认智能体',
            apiKey: '',
            baseUrl: ''
          };
          console.log(`讨论模式：使用默认智能体配置 ${selectedAgent.name}`);
        }
          
          if (!agentConfig) {
            console.error(`讨论模式：未找到智能体配置 ${selectedAgent.name}`);
            round++;
            continue;
          }
          
          // 创建智能体回复消息
          const assistantMessageId = (Date.now() + 2).toString();
          const assistantMessage: Message = {
            id: assistantMessageId,
            agentName: agentConfig.name,
            agentColor: agentConfig.color,
            content: "思考中......",
            timestamp: new Date().toISOString(),
            isUser: false,
          };
          
          setMessages(prev => [...prev, assistantMessage]);
          setCurrentStreamingMessageId(assistantMessageId);
          
          // 调用FastGPT API获取智能体回复
          await new Promise<void>((resolve, reject) => {
            // 格式化当前讨论内容
            const formattedDiscussion = currentMessages.map(msg => 
              msg.role === 'user' ? msg.content : msg.content
            ).join('\n\n');
            
            // 创建格式化后的消息
            const formattedMessages: FastGPTMessage[] = [
              {
                role: 'user',
                content: formattedDiscussion
              }
            ];
            
            // 调用FastGPT API
            callFastGPT(
              agentConfig.id,
              agentConfig.name,
              `groupchat_${group?.id}`,
              formattedMessages,
              (chunk: string) => {
                // 在每次接收到chunk时检查暂停状态
                if (discussionPaused) {
                  console.log('检测到暂停状态，停止接收更多内容');
                  return;
                }
                
                // 流式更新消息内容
                setMessages(prevMessages => 
                  prevMessages.map(msg => 
                    msg.id === assistantMessageId 
                      ? { ...msg, content: msg.content === "思考中......" ? chunk : msg.content + chunk }
                      : msg
                  )
                );
              },
              () => {
                // 流式完成
                setCurrentStreamingMessageId(null);
                resolve();
              },
              (error: Error) => {
                // 如果是中止错误，不显示错误消息
                if (error.name === 'AbortError') {
                  console.log(`智能体 ${selectedAgent.name} 请求被中止`);
                  setCurrentStreamingMessageId(null);
                  return;
                }
                
                // 处理错误
                console.error(`讨论模式：智能体 ${selectedAgent.name} 回复错误:`, error);
                
                let errorMessage = "[请求出错，请稍后再试]";
                if (error.message.includes('401')) {
                  errorMessage = "[API密钥无效，请联系管理员]";
                } else if (error.message.includes('403')) {
                  errorMessage = "[API访问被拒绝，请联系管理员]";
                } else if (error.message.includes('404')) {
                  errorMessage = "[API服务未找到，请联系管理员]";
                } else if (error.message.includes('429')) {
                  errorMessage = "[请求过于频繁，请稍后再试]";
                } else if (error.message.includes('500')) {
                  errorMessage = "[服务器内部错误，请稍后再试]";
                }
                
                setMessages(prevMessages => 
                  prevMessages.map(msg => 
                    msg.id === assistantMessageId 
                      ? { ...msg, content: errorMessage }
                      : msg
                  )
                );
                
                setCurrentStreamingMessageId(null);
                reject(error);
              },
              abortControllerRef.current?.signal // 传递 AbortSignal
            );
          });
          
          // 获取智能体的完整回复，并添加到消息历史中
          setMessages(currentMsgs => {
            const assistantMsg = currentMsgs.find(msg => msg.id === assistantMessageId);
            if (assistantMsg) {
              currentMessages.push({
                role: 'assistant' as const,
                content: `${assistantMsg.agentName}：${assistantMsg.content}`
              });
            }
            return currentMsgs;
          });
          
          // 等待一段时间，让用户看到智能体的回答
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          round++;
        } else {
          throw new Error('API返回格式错误');
        }
      } catch (error) {
        // 如果是中止错误，直接返回
        if (error instanceof Error && error.name === 'AbortError') {
          console.log(`第${round}轮讨论被中止`);
          return;
        }
        
        console.error(`第${round}轮讨论失败:`, error);
        round++;
      }
    }
    
    // 讨论结束
    if (round > discussionRounds) {
      const endMessage: Message = {
        id: (Date.now() + 1).toString(),
        agentName: "调度中心",
        agentColor: "bg-gray-500",
        content: `讨论已完成（共${discussionRounds}轮）。点击继续讨论按钮可开始新一轮讨论。`,
        timestamp: new Date().toISOString(),
        isUser: false,
      };
      
      setMessages(prev => [...prev, endMessage]);
      setDiscussionCompleted(true);
      setDiscussionWaitingForInput(true);
    }
    
    // 清理 AbortController
    abortControllerRef.current = null;
    
    // 所有智能体都回复完成后，结束加载状态
    setIsLoading(false);
  };

  // 处理暂停讨论的函数
  const handlePauseDiscussion = () => {
    setDiscussionPaused(true);
    setIsLoading(false);
  };

  // 处理恢复讨论的函数
  const handleResumeDiscussion = () => {
    if (discussionCompleted) {
      setDiscussionPaused(false);
      setDiscussionCompleted(false);
      setDiscussionWaitingForInput(true);
    } else if (discussionPaused) {
      setDiscussionPaused(false);
    }
  };

  // 处理开启讨论模式
  const handleStartDiscussion = () => {
    setIsDiscussionMode(true);
    setDiscussionPaused(false);
    setDiscussionCompleted(false);
    setDiscussionWaitingForInput(false);
  };

  // 处理关闭讨论模式
  const handleStopDiscussion = () => {
    setIsDiscussionMode(false);
    setDiscussionPaused(false);
    setDiscussionCompleted(false);
    setDiscussionWaitingForInput(false);
  };

  // 处理发送消息
  const handleSend = async () => {
    if (!inputValue.trim() || isLoading || !group) return;
    
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
          agentIds: getGroupAgents().map(agent => agent.id),
          discuss: isDiscussionMode
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

  // 处理显示群聊列表
  const handleShowGroupList = () => {
    setShowGroupSidebar('list');
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

  if (!group) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="text-center">
          <Users className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <div className="text-sm text-slate-500 dark:text-slate-400">选择一个群聊开始聊天</div>
        </div>
      </div>
    );
  }

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
            variant={isDiscussionMode ? "default" : "outline"}
            size="sm"
            onClick={isDiscussionMode ? handleStopDiscussion : handleStartDiscussion}
            className="h-8 px-3"
            title={isDiscussionMode ? "关闭讨论模式" : "开启讨论模式"}
          >
            {isDiscussionMode ? (
              <>
                <MessageSquare className="h-4 w-4 mr-1" />
                讨论中
              </>
            ) : (
              <>
                <MessageSquareOff className="h-4 w-4 mr-1" />
                普通模式
              </>
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleShowGroupList}
            className="h-8 w-8 p-0"
            title="群聊列表"
          >
            <Users className="h-4 w-4" />
          </Button>
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
        isDiscussionMode={isDiscussionMode}
        discussionPaused={discussionPaused}
        discussionCompleted={discussionCompleted}
        discussionWaitingForInput={discussionWaitingForInput}
        onPauseDiscussion={handlePauseDiscussion}
        onResumeDiscussion={handleResumeDiscussion}
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
          {showGroupSidebar === 'list' ? (
            <div className="h-full">
              <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
                <h2 className="text-lg font-medium text-slate-800 dark:text-slate-200">群聊列表</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSidebarBack}
                  className="h-8 w-8 p-0"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </div>
              <GroupChatList
                onSelectGroup={(selectedGroup) => {
                  onShowGroupDetail(selectedGroup);
                  setShowGroupSidebar(null);
                }}
                onCreateNewGroup={() => {}}
                selectedGroupId={group.id}
              />
            </div>
          ) : (
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