"use client";

import { useState, useRef, useEffect } from "react";
import { Message, Agent, GroupChat } from "@/types/chat";
import { ChatHeader } from "./ChatHeader";
import { MessageList } from "./MessageList";
import { ChatInput } from "./ChatInput";
import { SuggestionBubbles } from "./SuggestionBubbles";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Users, Plus, Settings, MessageSquare, MessageSquareOff, Phone, Video, ChevronDown } from "lucide-react";
import { GroupChatDetail } from "./GroupChatDetail";
import { callFastGPT, FastGPTMessage, getAgentApiKey, callDiscussionDispatchCenter } from "@/lib/fastgpt";

interface GroupChatInterfaceProps {
  group: GroupChat | null;
  agents: Agent[];
  onBack: () => void;
  onShowGroupDetail: (group: GroupChat) => void;
}

export function GroupChatInterface({
  group,
  agents,
  onBack,
  onShowGroupDetail
}: GroupChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showAgentList, setShowAgentList] = useState(false);
  const [mentionStartIndex, setMentionStartIndex] = useState<number | null>(null);
  const [filteredAgents, setFilteredAgents] = useState<Agent[]>([]);
  const [isComposing, setIsComposing] = useState(false);
  const [showGroupSidebar, setShowGroupSidebar] = useState<'detail' | null>(null);
  
  // 讨论状态管理
  const [isDiscussionMode, setIsDiscussionMode] = useState(false);
  const [discussionPaused, setDiscussionPaused] = useState(false);
  const [discussionCompleted, setDiscussionCompleted] = useState(false);
  const [discussionWaitingForInput, setDiscussionWaitingForInput] = useState(false);
  const [discussionRounds, setDiscussionRounds] = useState(3); // 默认讨论轮数
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

  // 清理effect - 组件卸载时重置状态
  useEffect(() => {
    return () => {
      // 组件卸载时重置所有状态
      setShowGroupSidebar(null);
      setIsLoading(false);
      setCurrentStreamingMessageId(null);
    };
  }, []);

  // Load chat history when group changes
  useEffect(() => {
    if (!group) return;

    const loadChatHistory = async () => {
      try {
        const response = await fetch(`/api/groupchats/${group.id}/chat`);

        if (!response.ok) {
          throw new Error(`加载历史消息失败: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        if (data.success && data.messages && Array.isArray(data.messages)) {
          const historyMessages: Message[] = data.messages.map((msg: any) => ({
            id: msg.id,
            agentName: msg.agentName,
            agentColor: msg.agentColor,
            content: msg.content,
            timestamp: msg.timestamp,
            isUser: msg.isUser,
          }));

          setMessages(historyMessages);
        } else {
          console.warn('API返回的历史消息格式不正确');
          setMessages([]);
        }
      } catch (error) {
        console.error('加载历史消息失败:', error);
        // 如果加载失败，从空的消息开始
        setMessages([]);
      }
    };

    loadChatHistory();
  }, [group]);

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
              group?.id || '',
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

    const messageContent = inputValue;
    const groupAgents = getGroupAgents();

    // 立即显示用户消息
    const userMessage: Message = {
      id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      agentName: "用户",
      agentColor: "#3b82f6",
      content: messageContent,
      timestamp: new Date().toISOString(),
      isUser: true,
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    // 准备调用FastGPT的消息格式
    const fastGPTMessages: FastGPTMessage[] = [
      {
        role: 'user',
        content: messageContent
      }
    ];

    try {
      // 首先调用调度中心获取智能体列表
      const dispatchResponse = await callDiscussionDispatchCenter(
        group.id,
        fastGPTMessages,
        group.id,
        isDiscussionMode
      );

      if (dispatchResponse && dispatchResponse.choices && dispatchResponse.choices.length > 0) {
        const content = dispatchResponse.choices[0].message.content;
        let agentList: any[] = [];

        console.log('Raw dispatch content:', content);

        try {
          // 尝试清理content并解析JSON
          const cleanContent = content.trim();
          if (cleanContent) {
            agentList = JSON.parse(cleanContent);
          }
        } catch (parseError) {
          console.error('Failed to parse agent list:', parseError);
          console.error('Content that failed to parse:', content);

          // 如果解析失败，使用默认智能体逻辑
          agentList = [];
        }

        if (Array.isArray(agentList) && agentList.length > 0) {
          // 为每个智能体创建"思考中"消息并进行流式调用
          const agentPromises = agentList.map(async (agentInfo: { id: string; name: string }, index: number) => {
            const agent = groupAgents.find(a => a.name === agentInfo.name);

            // 创建"思考中"消息
            const agentMessageId = `agent_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`;
            const agentMessage: Message = {
              id: agentMessageId,
              agentName: agentInfo.name,
              agentColor: agent?.color || '#6366f1',
              content: "思考中......",
              timestamp: new Date().toISOString(),
              isUser: false,
            };

            setMessages(prev => [...prev, agentMessage]);

            // 异步保存用户消息到数据库
            saveGroupMessage(
              group.id,
              userMessage.id,
              userMessage.agentName,
              userMessage.agentColor,
              userMessage.content,
              true
            ).catch(error => {
              console.error('Failed to save user message:', error);
            });

            // 进行流式调用
            await new Promise<void>((resolve) => {
              callFastGPT(
                agentInfo.id,
                agentInfo.name,
                group.id,
                fastGPTMessages,
                (chunk: string) => {
                  // 流式更新消息内容
                  setMessages(prevMessages =>
                    prevMessages.map(msg =>
                      msg.id === agentMessageId
                        ? { ...msg, content: msg.content === "思考中......" ? chunk : msg.content + chunk }
                        : msg
                    )
                  );
                },
                () => {
                  // 流式完成，保存最终回复到数据库
                  setMessages(prevMessages => {
                    const finalMessage = prevMessages.find(msg => msg.id === agentMessageId);
                    if (finalMessage && finalMessage.content !== "思考中......") {
                      saveGroupMessage(
                        group.id,
                        agentMessageId,
                        agentInfo.name,
                        agent?.color || '#6366f1',
                        finalMessage.content,
                        false
                      ).catch(error => {
                        console.error('Failed to save agent message:', error);
                      });
                    }
                    return prevMessages;
                  });
                  resolve();
                },
                (error: Error) => {
                  console.error(`Error calling agent ${agentInfo.name}:`, error);

                  // 更新为错误消息
                  setMessages(prevMessages =>
                    prevMessages.map(msg =>
                      msg.id === agentMessageId
                        ? {
                            ...msg,
                            content: `${agentInfo.name}回复出错: ${error.message}`
                          }
                        : msg
                    )
                  );
                  resolve();
                }
              );
            });
          });

          // 等待所有智能体完成回复
          await Promise.all(agentPromises);
        } else {
          // 使用默认智能体或群聊中的第一个智能体
          console.log('No agents found from dispatch center, using group agents');

          if (groupAgents.length > 0) {
            const defaultAgent = groupAgents[0];

            // 创建"思考中"消息
            const agentMessageId = `agent_${Date.now()}_0_${Math.random().toString(36).substr(2, 9)}`;
            const agentMessage: Message = {
              id: agentMessageId,
              agentName: defaultAgent.name,
              agentColor: defaultAgent.color,
              content: "思考中......",
              timestamp: new Date().toISOString(),
              isUser: false,
            };

            setMessages(prev => [...prev, agentMessage]);

            // 进行流式调用
            await new Promise<void>((resolve) => {
              callFastGPT(
                defaultAgent.id,
                defaultAgent.name,
                group.id,
                fastGPTMessages,
                (chunk: string) => {
                  // 流式更新消息内容
                  setMessages(prevMessages =>
                    prevMessages.map(msg =>
                      msg.id === agentMessageId
                        ? { ...msg, content: msg.content === "思考中......" ? chunk : msg.content + chunk }
                        : msg
                    )
                  );
                },
                () => {
                  // 流式完成，保存最终回复到数据库
                  setMessages(prevMessages => {
                    const finalMessage = prevMessages.find(msg => msg.id === agentMessageId);
                    if (finalMessage && finalMessage.content !== "思考中......") {
                      saveGroupMessage(
                        group.id,
                        agentMessageId,
                        defaultAgent.name,
                        defaultAgent.color,
                        finalMessage.content,
                        false
                      ).catch(error => {
                        console.error('Failed to save agent message:', error);
                      });
                    }
                    return prevMessages;
                  });
                  resolve();
                },
                (error: Error) => {
                  console.error(`Error calling default agent ${defaultAgent.name}:`, error);

                  // 更新为错误消息
                  setMessages(prevMessages =>
                    prevMessages.map(msg =>
                      msg.id === agentMessageId
                        ? {
                            ...msg,
                            content: `${defaultAgent.name}回复出错: ${error.message}`
                          }
                        : msg
                    )
                  );
                  resolve();
                }
              );
            });
          } else {
            console.log('No agents available in this group');

            const errorMessage: Message = {
              id: `error_${Date.now()}`,
              agentName: "系统",
              agentColor: "#ef4444",
              content: "群聊中没有可用的智能体",
              timestamp: new Date().toISOString(),
              isUser: false,
            };

            setMessages(prev => [...prev, errorMessage]);
          }
        }
      } else {
        // 调度中心调用失败，使用群聊中的第一个智能体
        console.log('Dispatch center failed, using group agents');

        if (groupAgents.length > 0) {
          const defaultAgent = groupAgents[0];

          // 创建"思考中"消息
          const agentMessageId = `agent_${Date.now()}_0_${Math.random().toString(36).substr(2, 9)}`;
          const agentMessage: Message = {
            id: agentMessageId,
            agentName: defaultAgent.name,
            agentColor: defaultAgent.color,
            content: "思考中......",
            timestamp: new Date().toISOString(),
            isUser: false,
          };

          setMessages(prev => [...prev, agentMessage]);

          // 进行流式调用
          await new Promise<void>((resolve) => {
            callFastGPT(
              defaultAgent.id,
              defaultAgent.name,
              group.id,
              fastGPTMessages,
              (chunk: string) => {
                // 流式更新消息内容
                setMessages(prevMessages =>
                  prevMessages.map(msg =>
                    msg.id === agentMessageId
                      ? { ...msg, content: msg.content === "思考中......" ? chunk : msg.content + chunk }
                      : msg
                  )
                );
              },
              () => {
                // 流式完成，保存最终回复到数据库
                setMessages(prevMessages => {
                  const finalMessage = prevMessages.find(msg => msg.id === agentMessageId);
                  if (finalMessage && finalMessage.content !== "思考中......") {
                    saveGroupMessage(
                      group.id,
                      agentMessageId,
                      defaultAgent.name,
                      defaultAgent.color,
                      finalMessage.content,
                      false
                    ).catch(error => {
                      console.error('Failed to save agent message:', error);
                    });
                  }
                  return prevMessages;
                });
                resolve();
              },
              (error: Error) => {
                console.error(`Error calling default agent ${defaultAgent.name}:`, error);

                // 更新为错误消息
                setMessages(prevMessages =>
                  prevMessages.map(msg =>
                    msg.id === agentMessageId
                      ? {
                          ...msg,
                          content: `${defaultAgent.name}回复出错: ${error.message}`
                        }
                      : msg
                  )
                );
                resolve();
              }
            );
          });
        }
      }
    } catch (error) {
      console.error('发送消息失败:', error);

      const errorMessage: Message = {
        id: `error_${Date.now()}`,
        agentName: "系统",
        agentColor: "#ef4444",
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
    setShowGroupSidebar('detail');
  };

  // 处理侧边栏返回
  const handleSidebarBack = () => {
    setShowGroupSidebar(null);
  };

  // 保存群聊消息到数据库
  const saveGroupMessage = async (
    groupId: string,
    messageId: string,
    agentName: string,
    agentColor: string,
    content: string,
    isUser: boolean
  ) => {
    try {
      const response = await fetch(`/api/groupchats/${groupId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messageId,
          agentName,
          agentColor,
          content,
          isUser
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Failed to save message to database:', response.status, response.statusText, errorText);

        // 如果是重复键错误，不是真正的错误，忽略它
        if (response.status === 409 || errorText.includes('duplicate key')) {
          console.log('Message already saved (duplicate key error ignored)');
          return;
        }
      } else {
        const data = await response.json();
        if (data.alreadyExists) {
          console.log('Message already exists in database:', data.message?.id);
        } else {
          console.log('Message saved successfully:', data.message?.id);
        }
      }
    } catch (error) {
      console.error('Error saving group message:', error);
    }
  };

  // 更新思考中的消息为正式回复（现在不再需要，因为我们使用流式更新）
  const updateThinkingMessages = async (groupId: string) => {
    // 保留这个函数以防将来需要
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
    <div className="h-16 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between px-6 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md sticky top-0 z-10">
      <div className="flex items-center gap-3">
        <div className="flex flex-col">
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">{group.name}</h2>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs text-zinc-500">{getGroupAgents().length} agents active</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant={isDiscussionMode ? "default" : "ghost"}
          size="sm"
          className={`${isDiscussionMode ? "bg-blue-600 hover:bg-blue-700 text-white" : "text-zinc-500"} mr-2`}
          onClick={isDiscussionMode ? handleStopDiscussion : handleStartDiscussion}
        >
          <MessageSquare className="h-4 w-4 mr-1.5" />
          {isDiscussionMode ? "讨论中" : "开启讨论"}
        </Button>

        {isDiscussionMode && (
          <div className="flex items-center gap-2 mr-2">
            <span className="text-sm text-zinc-600">讨论轮数:</span>
            <Select value={discussionRounds.toString()} onValueChange={(value: string) => setDiscussionRounds(parseInt(value))}>
              <SelectTrigger className="w-16 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1</SelectItem>
                <SelectItem value="2">2</SelectItem>
                <SelectItem value="3">3</SelectItem>
                <SelectItem value="4">4</SelectItem>
                <SelectItem value="5">5</SelectItem>
                <SelectItem value="6">6</SelectItem>
                <SelectItem value="7">7</SelectItem>
                <SelectItem value="8">8</SelectItem>
                <SelectItem value="9">9</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

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

      {/* 群聊详情侧边栏 */}
      {showGroupSidebar === 'detail' && (
        <div className="absolute top-0 right-0 h-full w-52 sm:w-60 bg-slate-50 dark:bg-slate-900 z-10 shadow-lg">
          <GroupChatDetail
            group={group}
            onBack={handleSidebarBack}
            onUpdateGroup={() => {}}
            onStartChat={() => {}}
          />
        </div>
      )}
    </div>
  );
}