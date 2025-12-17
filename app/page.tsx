"use client";

import { useState, useRef, useEffect } from "react";
import { callFastGPT, FastGPTMessage, extractMentionedAgent, loadAgentConfigs, callDispatchCenter, getAgentApiKey, DispatchCenterResponse } from "@/lib/fastgpt";
import { Message, Agent } from "@/types/chat";

interface ChatHistoryItem {
  id: string;
  title: string;
  date: string;
  preview: string;
}
import { DualSidebar } from "@/components/DualSidebar";
import { ChatHeader } from "@/components/ChatHeader";
import { MessageList } from "@/components/MessageList";
import { ChatInput } from "@/components/ChatInput";
import { AgentConfigSidebar } from "@/components/AgentConfigSidebar";
import { CreateAgentSidebar } from "@/components/CreateAgentSidebar";
import { SuggestionBubbles } from "@/components/SuggestionBubbles";

export default function Home() {
  // Static initial data to prevent hydration mismatch
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isComposing, setIsComposing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showAgentList, setShowAgentList] = useState(false);
  const [mentionStartIndex, setMentionStartIndex] = useState<number | null>(null);
  const [filteredAgents, setFilteredAgents] = useState<Agent[]>([]);
  const [chatId, setChatId] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [isConfigSidebarOpen, setIsConfigSidebarOpen] = useState(false);
  const [isCreateAgentSidebarOpen, setIsCreateAgentSidebarOpen] = useState(false);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [currentStreamingMessageId, setCurrentStreamingMessageId] = useState<string | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<{
    focus: () => void;
    setCursorPosition: (position: number) => void;
  }>(null);

  // Auto scroll to bottom when new messages are added
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [messages]);

  // Load agent configs from database on mount
  useEffect(() => {
    loadAgentConfigs();
    loadAgentsFromDatabase();
  }, []);

  // 从数据库加载智能体数据
  const loadAgentsFromDatabase = async () => {
    try {
      const response = await fetch('/api/agents');
      if (response.ok) {
        const agentsData = await response.json();
        // 转换数据库中的智能体数据为前端需要的格式
        const formattedAgents: Agent[] = agentsData.map((agent: {
          _id: string;
          name: string;
          role: string;
          introduction: string;
          status: string;
          apiKey: string;
          color: string;
          baseUrl: string;
        }) => ({
          id: agent._id.toString(), // 使用MongoDB的_id
          name: agent.name,
          role: agent.role,
          introduction: agent.introduction || '',
          status: agent.status,
          color: agent.color,
          apiKey: agent.apiKey,
          baseUrl: agent.baseUrl
        }));
        // 更新智能体状态
        setAgents(formattedAgents);
        console.log('Loaded agents from database:', formattedAgents);
      } else {
        console.error('Failed to load agents from database');
      }
    } catch (error) {
      console.error('Error loading agents from database:', error);
    }
  };

  // 格式化日期显示文本的辅助函数
  const formatDateText = (updatedAt: string) => {
    const updatedDate = new Date(updatedAt);
    const now = new Date();
    
    // 获取本地时间的日期部分（忽略时间），用于计算天数差异
    const updatedDateOnly = new Date(updatedDate.getFullYear(), updatedDate.getMonth(), updatedDate.getDate());
    const nowDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // 计算天数差异（基于本地时间）
    const diffTime = nowDateOnly.getTime() - updatedDateOnly.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    let dateText;
    if (diffDays === 0) {
      // 今天的聊天显示具体时间，如 "14:30"
      dateText = updatedDate.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
    } else if (diffDays === 1) {
      dateText = '昨天';
    } else if (diffDays <= 7) {
      dateText = `${diffDays}天前`;
    } else {
      dateText = updatedDate.toLocaleDateString('zh-CN');
    }
    
    return dateText;
  };

  // 从数据库加载聊天记录
  const loadChatFromDatabase = async (chatId: string) => {
    try {
      const response = await fetch(`/api/chats/${chatId}`);
      if (response.ok) {
        const chatData = await response.json();
        setMessages(chatData.messages);
        setChatId(chatData.id);
        return true;
      } else {
        console.error('Failed to load chat from database');
        return false;
      }
    } catch (error) {
      console.error('Error loading chat from database:', error);
      return false;
    }
  };

  // 保存聊天记录到数据库
  const saveChatToDatabase = async (chatId: string, messages: Message[], title?: string, retryCount: number = 0) => {
    try {
      const payload: { messages: Message[]; title?: string } = { messages };
      
      // 如果是新聊天，需要提供标题
      if (title) {
        payload.title = title;
      }
      
      const response = await fetch(`/api/chats/${chatId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      if (response.ok) {
        const chatData = await response.json();
        return chatData;
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to save chat to database:', response.status, errorData.error || 'Unknown error');
        
        // 如果是版本冲突错误且重试次数少于3次，则延迟后重试
        if (response.status === 500 && errorData.error && errorData.error.includes('版本') && retryCount < 3) {
          console.log(`Retrying save operation (attempt ${retryCount + 1}/3)...`);
          // 延迟一段时间后重试，避免立即重试导致相同的冲突
          await new Promise(resolve => setTimeout(resolve, 100 * (retryCount + 1)));
          return saveChatToDatabase(chatId, messages, title, retryCount + 1);
        }
        
        return null;
      }
    } catch (error) {
      console.error('Error saving chat to database:', error);
      return null;
    }
  };

  // 创建新聊天记录
  const createNewChatInDatabase = async (title: string, messages: Message[] = []) => {
    try {
      const response = await fetch('/api/chats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title, messages }),
      });
      
      if (response.ok) {
        const chatData = await response.json();
        return chatData;
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to create new chat in database:', response.status, errorData.error || 'Unknown error');
        return null;
      }
    } catch (error) {
      console.error('Error creating new chat in database:', error);
      return null;
    }
  };



  const handleSend = async () => {
    if (inputValue.trim() && !isComposing && !isLoading) {
      // 提取@的智能体
      const mentionedAgent = extractMentionedAgent(inputValue);
      // 保留原始输入，不移除@部分
      const messageContent = inputValue.trim();
      
      // 生成或使用现有的chatId
      let currentChatId = chatId;
      
      if (!currentChatId || currentChatId === "newchat") {
        // 如果是新聊天或临时新对话框，先在数据库中创建记录
        const chatTitle = messageContent.length > 20 ? 
          messageContent.substring(0, 20) + '...' : 
          messageContent;
        
        const newChatData = await createNewChatInDatabase(chatTitle);
        if (newChatData) {
          currentChatId = newChatData.id;
          setChatId(currentChatId);
          const isNewChat = true;
          
          // 如果是临时新对话框，先移除它
          if (chatId === "newchat" && (window as any).removeChatItem) {
            (window as any).removeChatItem("newchat");
          }
          
          // 新聊天创建成功后，直接添加到侧边栏列表顶部，避免刷新动画
          if ((window as any).addChatItem) {
            const newChatItem = {
              id: newChatData.id,
              title: chatTitle,
              date: formatDateText(newChatData.updatedAt),
              preview: messageContent.length > 50 ? messageContent.substring(0, 50) + '...' : messageContent
            };
            (window as any).addChatItem(newChatItem);
          }
        } else {
          console.error('Failed to create new chat in database');
          // 如果创建失败，使用临时ID
          currentChatId = `temp_${Date.now()}`;
          setChatId(currentChatId);
        }
      }
      
      // 添加用户消息
      const userMessage: Message = {
        id: Date.now().toString(),
        agentName: "John Doe",
        agentColor: "bg-indigo-600",
        content: messageContent, // 使用包含@智能体的原始消息内容
        timestamp: new Date().toISOString(),
        isUser: true,
      };
      
      setMessages(prev => {
        const updatedMessages = [...prev, userMessage];
        
        // 保存消息到数据库
        if (currentChatId && !currentChatId.startsWith('temp_')) {
          saveChatToDatabase(currentChatId, updatedMessages).then((chatData) => {
            // 消息保存成功后，更新侧边栏对应项的预览信息，避免刷新整个列表
            if ((window as any).updateChatItem && chatData && chatData.updatedAt) {
              // 获取最后一条非用户消息作为预览
              const lastAgentMessage = updatedMessages.slice().reverse().find(msg => !msg.isUser);
              if (lastAgentMessage) {
                const preview = lastAgentMessage.content.length > 50 ? 
                  lastAgentMessage.content.substring(0, 50) + '...' : 
                  lastAgentMessage.content;
                
                // 使用数据库返回的更新时间
                (window as any).updateChatItem(currentChatId, { 
                  preview,
                  date: formatDateText(chatData.updatedAt)
                });
              }
            }
          }).catch(error => {
            console.error('Error saving chat to database:', error);
          });
        }
        
        return updatedMessages;
      });
      
      setInputValue("");
      setIsLoading(true);
      
      // 准备发送给FastGPT的消息历史，包含所有对话内容和智能体名称
      const fastgptMessages: FastGPTMessage[] = [
        // 添加所有历史消息，包括用户消息和智能体回复
        ...messages.map(m => ({
          role: m.isUser ? 'user' as const : 'assistant' as const,
          content: m.isUser ? m.content : `${m.agentName}：${m.content}` // 智能体回复添加名称前缀
        })),
        // 添加当前用户消息
        {
          role: 'user' as const,
          content: messageContent // 使用包含@智能体的原始消息内容
        }
      ];
      
      // 如果有@智能体，直接调用该智能体
      if (mentionedAgent) {
        console.log('Debug - mentionedAgent:', mentionedAgent);
        console.log('Debug - inputValue:', inputValue);
        console.log('Debug - messageContent:', messageContent);
        console.log('Debug - available agents:', agents.map(a => a.name));
        
        const agentConfig = agents.find(agent => agent.name === mentionedAgent);
        
        if (!agentConfig) {
          console.error("未找到智能体配置:", mentionedAgent);
          console.error("可用的智能体配置:", agents.map(a => a.name));
          // 显示错误消息给用户
          const errorMessage: Message = {
            id: (Date.now() + 1).toString(),
            agentName: "系统",
            agentColor: "bg-red-500",
            content: `错误：未找到智能体配置 "${mentionedAgent}」。可用的智能体：${agents.map(a => a.name).join('、')}`,
            timestamp: new Date().toISOString(),
            isUser: false,
          };
          setMessages(prev => [...prev, errorMessage]);
          setIsLoading(false);
          return;
        }
        
        // 创建一个助手消息，初始显示"思考中......"，用于流式更新
        const assistantMessageId = (Date.now() + 1).toString();
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
        
        console.log('Debug - fastgptMessages:', fastgptMessages);
        console.log('Debug - current agent config:', {
          name: agentConfig.name,
          id: agentConfig.id,
          color: agentConfig.color
        });
        
        // 调用FastGPT API - 现在通过后端代理
        callFastGPT(
          agentConfig.id,
          agentConfig.name,
          currentChatId || '',
          fastgptMessages,
          (chunk: string) => {
            // 流式更新消息内容，第一个chunk替换掉"思考中......"
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
            setIsLoading(false);
            setCurrentStreamingMessageId(null);
            
            // 保存完整的聊天记录到数据库
            if (currentChatId && !currentChatId.startsWith('temp_')) {
              // 获取当前消息状态
              setMessages(currentMessages => {
                saveChatToDatabase(currentChatId, currentMessages).then((chatData) => {
                  // 消息保存成功后，更新侧边栏对应项的预览信息，避免刷新整个列表
                  if ((window as any).updateChatItem && chatData && chatData.updatedAt) {
                    // 获取最后一条非用户消息作为预览
                    const lastAgentMessage = currentMessages.slice().reverse().find(msg => !msg.isUser);
                    if (lastAgentMessage) {
                      const preview = lastAgentMessage.content.length > 50 ? 
                        lastAgentMessage.content.substring(0, 50) + '...' : 
                        lastAgentMessage.content;
                      (window as any).updateChatItem(currentChatId, { 
                      preview,
                      date: formatDateText(chatData.updatedAt)
                    });
                    }
                  }
                }).catch(error => {
                  console.error('Error saving chat to database:', error);
                });
                return currentMessages;
              });
            }
            
            // AI回复完成后自动聚焦输入框
            setTimeout(() => {
              chatInputRef.current?.focus();
            }, 100);
          },
          (error: Error) => {
            // 处理错误
            console.error("FastGPT API error:", error);
            console.error("Error details:", {
              agentName: agentConfig.name,
              agentId: agentConfig.id,
              chatId: currentChatId,
              messagesCount: fastgptMessages.length
            });
            
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
            
            // 保存错误消息到数据库
            if (currentChatId && !currentChatId.startsWith('temp_')) {
              setMessages(currentMessages => {
                saveChatToDatabase(currentChatId, currentMessages).then((chatData) => {
                  // 消息保存成功后，更新侧边栏对应项的预览信息，避免刷新整个列表
                  if ((window as any).updateChatItem && chatData && chatData.updatedAt) {
                    // 获取最后一条非用户消息作为预览
                    const lastAgentMessage = currentMessages.slice().reverse().find(msg => !msg.isUser);
                    if (lastAgentMessage) {
                      const preview = lastAgentMessage.content.length > 50 ? 
                        lastAgentMessage.content.substring(0, 50) + '...' : 
                        lastAgentMessage.content;
                      (window as any).updateChatItem(currentChatId, { 
                    preview,
                    date: formatDateText(chatData.updatedAt)
                  });
                    }
                  }
                }).catch(error => {
                  console.error('Error saving chat to database:', error);
                });
                return currentMessages;
              });
            }
            
            setIsLoading(false);
            setCurrentStreamingMessageId(null);
            // 错误处理后也聚焦输入框，方便用户重新输入
            setTimeout(() => {
              chatInputRef.current?.focus();
            }, 100);
          }
        );
      } else {
        // 没有艾特智能体，先调用调度中心
        let dispatchMessageId: string | null = null;
        
        try {
          console.log('No agent mentioned, calling dispatch center...');
          
          // 创建调度中心思考中的消息
          dispatchMessageId = (Date.now() + 1).toString();
          const dispatchMessage: Message = {
            id: dispatchMessageId,
            agentName: "调度中心",
            agentColor: "bg-gray-500",
            content: "正在分析任务并分配智能体...",
            timestamp: new Date().toISOString(),
            isUser: false,
          };
          
          setMessages(prev => [...prev, dispatchMessage]);
          
          // 调用调度中心API
          const dispatchResponse: DispatchCenterResponse = await callDispatchCenter(currentChatId || '', fastgptMessages);
          
          // 解析调度中心返回的智能体列表
          let agentList = [];
          try {
            agentList = JSON.parse(dispatchResponse.choices[0].message.content);
            console.log('Parsed agent list from dispatch center:', agentList);
          } catch (parseError) {
            console.error('Failed to parse agent list from dispatch center:', parseError);
            throw new Error('调度中心返回的智能体列表格式错误');
          }
          
          // 如果调度中心返回空数组，从数据库获取默认智能体
          if (!agentList || agentList.length === 0) {
            console.log('Dispatch center returned empty list, fetching default agent from database');
            try {
              // 获取默认智能体 (ID: 6940567f484105cda2d631f5)
              const response = await fetch('/api/agents/default');
              if (response.ok) {
                const defaultAgent = await response.json();
                agentList = [{ 
                  id: defaultAgent.id,
                  name: defaultAgent.name 
                }] as Array<{ id: string; name: string }>;
              } else {
                throw new Error('Failed to fetch default agent');
              }
            } catch (error) {
              console.error('Error fetching default agent:', error);
              // 如果无法获取默认智能体，显示错误消息
              const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                agentName: "系统",
                agentColor: "bg-red-500",
                content: "错误：无法获取默认智能体，请检查数据库配置",
                timestamp: new Date().toISOString(),
                isUser: false,
              };
              setMessages(prev => [...prev, errorMessage]);
              setIsLoading(false);
              return;
            }
          }
          
          // 更新调度中心消息，显示选择的智能体
          const agentNames = agentList.map((agent: { id: string; name: string }) => agent.name).join('、');
          setMessages(prevMessages => 
            prevMessages.map(msg => 
              msg.id === dispatchMessageId 
                ? { ...msg, content: `${agentNames}正在为您分析需求...` }
                : msg
            )
          );
          
          // 按顺序调用智能体
          await callAgentsSequentially(agentList, currentChatId || '', fastgptMessages);
          
        } catch (error) {
          console.error('Error in dispatch center flow:', error);
          
          // 更新调度中心消息为错误信息
          if (dispatchMessageId) {
            setMessages(prevMessages => 
              prevMessages.map(msg => 
                msg.id === dispatchMessageId 
                  ? { ...msg, content: `[调度中心错误：${error instanceof Error ? error.message : '未知错误'}]` }
                  : msg
              )
            );
            
            // 保存错误消息到数据库
            if (currentChatId && !currentChatId.startsWith('temp_')) {
              setMessages(currentMessages => {
                saveChatToDatabase(currentChatId, currentMessages).then((chatData) => {
                  // 消息保存成功后，更新侧边栏对应项的预览信息，避免刷新整个列表
                  if ((window as any).updateChatItem && chatData && chatData.updatedAt) {
                    // 获取最后一条非用户消息作为预览
                    const lastAgentMessage = currentMessages.slice().reverse().find(msg => !msg.isUser);
                    if (lastAgentMessage) {
                      const preview = lastAgentMessage.content.length > 50 ? 
                        lastAgentMessage.content.substring(0, 50) + '...' : 
                        lastAgentMessage.content;
                      (window as any).updateChatItem(currentChatId, { 
                      preview,
                      date: formatDateText(chatData.updatedAt)
                    });
                    }
                  }
                }).catch(error => {
                  console.error('Error saving chat to database:', error);
                });
                return currentMessages;
              });
            }
          }
          
          setIsLoading(false);
        }
      }
    }
  };
  
  // 按顺序调用智能体的函数
  const callAgentsSequentially = async (
    agentList: Array<{ id: string; name: string }>, 
    chatId: string, 
    initialMessages: FastGPTMessage[]
  ) => {
    // 保存原始消息历史，每个智能体都使用相同的初始消息
    const originalMessages = [...initialMessages];
    
    for (let i = 0; i < agentList.length; i++) {
      const agentListItem = agentList[i];
      console.log(`Calling agent ${i + 1}/${agentList.length}:`, agentListItem);
      
      // 从agents状态中获取完整的智能体信息，包括颜色
      const agentInfo = agents.find(agent => agent.name === agentListItem.name) || {
        id: agentListItem.id,
        name: agentListItem.name,
        color: 'bg-blue-500', // 默认颜色
        role: '',
        introduction: '',
        status: 'offline',
        apiKey: '',
        baseUrl: 'https://cloud.fastgpt.io/'
      };
      
      // 获取智能体API密钥
      const apiKey = await getAgentApiKey(agentInfo.id, agentInfo.name);
      
      if (!apiKey) {
        console.error(`Failed to get API key for agent:`, agentInfo);
        
        // 创建错误消息
        const errorMessage: Message = {
          id: (Date.now() + i + 2).toString(),
          agentName: "系统",
          agentColor: "bg-red-500",
          content: `错误：无法获取智能体 "${agentInfo.name}" 的API密钥，请检查智能体配置`,
          timestamp: new Date().toISOString(),
          isUser: false,
        };
        
        setMessages(prev => [...prev, errorMessage]);
        continue;
      }
      
      // 创建智能体消息，初始显示"思考中......"
      const agentMessageId = (Date.now() + i + 2).toString();
      const agentMessage: Message = {
        id: agentMessageId,
        agentName: agentInfo.name,
        agentColor: agentInfo.color || "bg-blue-500", // 使用数据库中的颜色，如果没有则使用默认颜色
        content: "思考中......",
        timestamp: new Date().toISOString(),
        isUser: false,
      };
      
      setMessages(prev => [...prev, agentMessage]);
      setCurrentStreamingMessageId(agentMessageId);
      
      // 调用智能体API，使用原始消息历史，不包含前面智能体的输出
      await new Promise<void>((resolve) => {
        callFastGPT(
          agentInfo.id,
          agentInfo.name,
          chatId,
          originalMessages, // 使用原始消息历史，不是currentMessages
          (chunk: string) => {
            // 流式更新消息内容，第一个chunk替换掉"思考中......"
            setMessages(prevMessages => 
              prevMessages.map(msg => 
                msg.id === agentMessageId 
                  ? { ...msg, content: msg.content === "思考中......" ? chunk : msg.content + chunk }
                  : msg
              )
            );
          },
          () => {
            // 流式完成，但不将智能体回复添加到消息历史中
            // 这样下一个智能体不会看到当前智能体的输出
            resolve();
          },
          (error: Error) => {
            // 处理错误
            console.error(`Error calling agent ${agentInfo.name}:`, error);
            
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
                msg.id === agentMessageId 
                  ? { ...msg, content: errorMessage }
                  : msg
              )
            );
            
            // 即使出错也要继续，避免阻塞后续智能体
            resolve();
          }
        );
      });
    }
    
    // 所有智能体调用完成
    setIsLoading(false);
    setCurrentStreamingMessageId(null);
    
    // 保存完整的聊天记录到数据库
    if (chatId && !chatId.startsWith('temp_')) {
      setMessages(currentMessages => {
        saveChatToDatabase(chatId, currentMessages).then((chatData) => {
          // 消息保存成功后，更新侧边栏对应项的预览信息，避免刷新整个列表
          if ((window as any).updateChatItem && chatData && chatData.updatedAt) {
            // 获取最后一条非用户消息作为预览
            const lastAgentMessage = currentMessages.slice().reverse().find(msg => !msg.isUser);
            if (lastAgentMessage) {
              const preview = lastAgentMessage.content.length > 50 ? 
                lastAgentMessage.content.substring(0, 50) + '...' : 
                lastAgentMessage.content;
              (window as any).updateChatItem(chatId, { 
                preview,
                date: formatDateText(chatData.updatedAt)
              });
            }
          }
        }).catch(error => {
          console.error('Error saving chat to database:', error);
        });
        return currentMessages;
      });
    }
    
    // 所有AI回复完成后自动聚焦输入框
    setTimeout(() => {
      chatInputRef.current?.focus();
    }, 100);
  };

  // 处理聊天选择
  const handleChatSelect = async (chatId: string) => {
    // 如果选择的是新对话框，则清空消息并设置临时ID
    if (chatId === "newchat") {
      setMessages([]);
      setChatId("newchat");
      setCurrentStreamingMessageId(null);
      setInputValue("");
      // 聚焦输入框
      setTimeout(() => {
        chatInputRef.current?.focus();
      }, 100);
      return;
    }
    
    // 加载对应的聊天记录
    const success = await loadChatFromDatabase(chatId);
    if (!success) {
      console.error("Failed to load chat:", chatId);
    }
  };

  // 处理智能体选择
  const handleAgentSelect = (agent: Agent) => {
    // 如果侧边栏已经打开且是同一个智能体，则关闭侧边栏
    if (isConfigSidebarOpen && selectedAgent?.id === agent.id) {
      setIsConfigSidebarOpen(false);
      setSelectedAgent(null);
    } else {
      // 否则打开侧边栏并选择智能体
      setSelectedAgent(agent);
      setIsConfigSidebarOpen(true);
    }
  };

  // 处理添加智能体
  const handleAddAgent = () => {
    setIsCreateAgentSidebarOpen(true);
  };

  // 处理创建智能体保存
  const handleCreateAgentSave = async (newAgent: Agent) => {
    // 添加新智能体到列表
    setAgents(prevAgents => [...prevAgents, newAgent]);
    
    setIsCreateAgentSidebarOpen(false);
  };

  // 处理智能体配置保存
  const handleAgentConfigSave = (updatedAgent: Agent) => {
    // 更新智能体列表中的对应智能体
    setAgents(prevAgents => 
      prevAgents.map(agent => 
        agent.id === updatedAgent.id ? updatedAgent : agent
      )
    );
    
    console.log("保存智能体配置:", updatedAgent);
    setIsConfigSidebarOpen(false);
    setSelectedAgent(null);
  };

  // 关闭配置侧边栏
  const handleCloseConfigSidebar = () => {
    setIsConfigSidebarOpen(false);
    setSelectedAgent(null);
  };

  // 新建对话
  const handleNewChat = () => {
    setMessages([]);
    setChatId("newchat"); // 使用固定的临时ID
    setCurrentStreamingMessageId(null);
    setInputValue("");
    
    // 检查是否已存在新对话框，避免重复创建
    // 通过全局函数获取当前聊天历史并检查
    let existingNewChat = false;
    if ((window as any).getChatHistory) {
      const currentChatHistory = (window as any).getChatHistory();
      existingNewChat = currentChatHistory && currentChatHistory.find((item: ChatHistoryItem) => item.id === "newchat");
    }
    
    if (!existingNewChat) {
      // 在聊天记录中增加一个newchat的框
      const newChatItem = {
        id: "newchat", // 使用固定ID
        title: "新对话",
        date: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }),
        preview: "开始新的对话..."
      };
      
      // 通过全局函数添加新的聊天项
      if ((window as any).addChatItem) {
        (window as any).addChatItem(newChatItem);
      }
    }
    
    // 新建对话后聚焦输入框
    setTimeout(() => {
      chatInputRef.current?.focus();
    }, 100);
  };
  
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
        
        // 过滤智能体
        const searchTerm = afterAt.toLowerCase();
        const filtered = agents.filter(agent =>
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
  
  // 处理提示气泡点击
  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion);
    // 聚焦输入框并将光标设置到文字末尾
    setTimeout(() => {
      if (chatInputRef.current) {
        chatInputRef.current.focus();
        chatInputRef.current.setCursorPosition(suggestion.length);
      }
    }, 100);
  };
  
  // 选择智能体
  const selectAgent = (agentName: string) => {
    if (mentionStartIndex !== null) {
      const beforeMention = inputValue.substring(0, mentionStartIndex);
      const newValue = `${beforeMention}@${agentName} `;
      setInputValue(newValue);
      setShowAgentList(false);
      setMentionStartIndex(null);
      
      // 设置光标位置到智能体名称后面
      setTimeout(() => {
        if (chatInputRef.current) {
          const cursorPosition = newValue.length;
          chatInputRef.current.setCursorPosition(cursorPosition);
        }
      }, 0);
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

  return (
    <div className="flex h-screen w-full items-center justify-center bg-zinc-50 dark:bg-zinc-950 font-sans">
      <div className="flex w-full h-full overflow-hidden rounded-none bg-white dark:bg-zinc-900 shadow-2xl border-0 border-zinc-200 dark:border-zinc-800">
        <DualSidebar agents={agents} onNewChat={handleNewChat} onChatSelect={handleChatSelect} onAgentSelect={handleAgentSelect} onAddAgent={handleAddAgent} />
        
        <div className="flex-1 flex flex-col bg-white dark:bg-zinc-950 relative">
          <ChatHeader agents={agents} />
          <MessageList messages={messages} scrollAreaRef={scrollAreaRef} />
          <SuggestionBubbles onSuggestionClick={handleSuggestionClick} />
          <ChatInput
            ref={chatInputRef}
            inputValue={inputValue}
            isLoading={isLoading}
            isComposing={isComposing}
            showAgentList={showAgentList}
            filteredAgents={filteredAgents}
            mentionStartIndex={mentionStartIndex}
            onInputChange={handleInputChange}
            onSend={handleSend}
            onKeyDown={handleKeyDown}
            onCompositionStart={() => setIsComposing(true)}
            onCompositionEnd={() => setIsComposing(false)}
            onSelectAgent={selectAgent}
          />
        </div>
      </div>
      
      {/* 智能体配置侧边栏 */}
      <AgentConfigSidebar
        isOpen={isConfigSidebarOpen}
        agent={selectedAgent}
        onClose={handleCloseConfigSidebar}
        onSave={handleAgentConfigSave}
      />
      <CreateAgentSidebar
        isOpen={isCreateAgentSidebarOpen}
        onClose={() => setIsCreateAgentSidebarOpen(false)}
        onSave={handleCreateAgentSave}
      />
    </div>
  );
}