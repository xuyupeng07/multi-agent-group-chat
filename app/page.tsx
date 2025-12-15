"use client";

import { useState, useRef, useEffect } from "react";
import { callFastGPT, FastGPTMessage, AGENT_CONFIGS, extractMentionedAgent, loadAgentConfigs, callDispatchCenter, getAgentApiKey, DispatchCenterResponse } from "@/lib/fastgpt";
import { Message, Agent } from "@/types/chat";
import { DualSidebar } from "@/components/DualSidebar";
import { ChatHeader } from "@/components/ChatHeader";
import { MessageList } from "@/components/MessageList";
import { ChatInput } from "@/components/ChatInput";
import { AgentConfigSidebar } from "@/components/AgentConfigSidebar";

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
        return chatData.id;
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
      
      if (!currentChatId) {
        // 如果是新聊天，先在数据库中创建记录
        const chatTitle = messageContent.length > 20 ? 
          messageContent.substring(0, 20) + '...' : 
          messageContent;
        
        const newChatId = await createNewChatInDatabase(chatTitle);
        if (newChatId) {
          currentChatId = newChatId;
          setChatId(currentChatId);
          const isNewChat = true;
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
        agentName: "Me",
        agentColor: "bg-indigo-600",
        content: messageContent, // 使用包含@智能体的原始消息内容
        timestamp: new Date().toISOString(),
        isUser: true,
      };
      
      setMessages(prev => {
        const updatedMessages = [...prev, userMessage];
        
        // 保存消息到数据库
        if (currentChatId && !currentChatId.startsWith('temp_')) {
          saveChatToDatabase(currentChatId, updatedMessages).catch(error => {
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
        console.log('Debug - available agents:', Object.keys(AGENT_CONFIGS));
        
        const agentConfig = AGENT_CONFIGS[mentionedAgent as keyof typeof AGENT_CONFIGS];
        
        if (!agentConfig) {
          console.error("未找到智能体配置:", mentionedAgent);
          console.error("可用的智能体配置:", Object.keys(AGENT_CONFIGS));
          // 显示错误消息给用户
          const errorMessage: Message = {
            id: (Date.now() + 1).toString(),
            agentName: "系统",
            agentColor: "bg-red-500",
            content: `错误：未找到智能体配置 "${mentionedAgent}」。可用的智能体：${Object.keys(AGENT_CONFIGS).join('、')}`,
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
                saveChatToDatabase(currentChatId, currentMessages).catch(error => {
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
                saveChatToDatabase(currentChatId, currentMessages).catch(error => {
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
          
          // 如果调度中心返回空数组，使用旅行管家
          if (!agentList || agentList.length === 0) {
            console.log('Dispatch center returned empty list, using travel butler');
            agentList = [{ 
              id: '', // 空ID，将通过名称匹配
              name: '旅行管家' 
            }] as Array<{ id: string; name: string }>;
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
                saveChatToDatabase(currentChatId, currentMessages).catch(error => {
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
      const agentInfo = agentList[i];
      console.log(`Calling agent ${i + 1}/${agentList.length}:`, agentInfo);
      
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
        agentColor: "bg-blue-500", // 默认颜色，可以根据需要从数据库获取
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
        saveChatToDatabase(chatId, currentMessages).catch(error => {
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
    // 加载对应的聊天记录
    const success = await loadChatFromDatabase(chatId);
    if (!success) {
      console.error("Failed to load chat:", chatId);
    }
  };

  // 处理智能体选择
  const handleAgentSelect = (agent: Agent) => {
    setSelectedAgent(agent);
    setIsConfigSidebarOpen(true);
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
    setChatId(null);
    setCurrentStreamingMessageId(null);
    setInputValue("");
    // 新建对话后聚焦输入框
    setTimeout(() => {
      chatInputRef.current?.focus();
    }, 100);
  };
  
  // 处理输入变化，检测@符号
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
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
        <DualSidebar agents={agents} onNewChat={handleNewChat} onChatSelect={handleChatSelect} onAgentSelect={handleAgentSelect} />
        
        <div className="flex-1 flex flex-col bg-white dark:bg-zinc-950 relative">
          <ChatHeader agents={agents} />
          <MessageList messages={messages} scrollAreaRef={scrollAreaRef} />
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
    </div>
  );
}