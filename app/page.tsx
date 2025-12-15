"use client";

import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Send,
  MoreVertical,
  Phone,
  Video,
  Search,
  Plus,
  Users,
  Settings,
  LogOut
} from "lucide-react";
import { FastGPTAgent, callFastGPT, FastGPTMessage, AGENT_CONFIGS, extractMentionedAgent, removeMentionFromText } from "@/lib/fastgpt";

interface Message {
  id: string;
  agentName: string;
  agentColor: string;
  content: string;
  timestamp: string; // Changed to string for serialization safety
  isUser: boolean;
}

interface Agent {
  id: string;
  name: string;
  role: string;
  status: "online" | "busy" | "offline";
  color: string;
  avatar?: string;
  apiKey?: string;
  shareId?: string;
}

export default function Home() {
  // Static initial data to prevent hydration mismatch
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isComposing, setIsComposing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentStreamingMessageId, setCurrentStreamingMessageId] = useState<string | null>(null);
  const [showAgentList, setShowAgentList] = useState(false);
  const [mentionStartIndex, setMentionStartIndex] = useState<number | null>(null);
  const [filteredAgents, setFilteredAgents] = useState<string[]>([]);
  const [chatId, setChatId] = useState<string | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto scroll to bottom when new messages are added
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [messages]);

  const agents: Agent[] = [
    { 
      id: "1", 
      name: "交通助手", 
      role: "Traffic Assistant", 
      status: "online", 
      color: "bg-blue-500"
    },
    { 
      id: "2", 
      name: "酒店管家", 
      role: "Hotel Butler", 
      status: "online", 
      color: "bg-green-500"
    },
    { 
      id: "3", 
      name: "美食顾问", 
      role: "Food Advisor", 
      status: "online", 
      color: "bg-purple-500"
    },
  ];

  const handleSend = () => {
    if (inputValue.trim() && !isComposing && !isLoading) {
      // 提取@的智能体
      const mentionedAgent = extractMentionedAgent(inputValue);
      // 移除@部分，获取实际消息内容
      const messageContent = removeMentionFromText(inputValue);
      
      // 如果没有@智能体，默认使用酒店管家
      const agentName = mentionedAgent || "酒店管家";
      const agentConfig = AGENT_CONFIGS[agentName as keyof typeof AGENT_CONFIGS];
      
      if (!agentConfig) {
        console.error("未找到智能体配置:", agentName);
        return;
      }
      
      // 生成或使用现有的chatId（使用用户第一句的时间戳）
      let currentChatId = chatId;
      if (!currentChatId) {
        currentChatId = `chat_${Date.now()}`;
        setChatId(currentChatId);
      }
      
      // 添加用户消息
      const userMessage: Message = {
        id: Date.now().toString(),
        agentName: "Me",
        agentColor: "bg-indigo-600",
        content: messageContent || inputValue, // 如果移除@后为空，使用原始输入
        timestamp: new Date().toISOString(),
        isUser: true,
      };
      
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
      
      setMessages([...messages, userMessage, assistantMessage]);
      setInputValue("");
      setIsLoading(true);
      setCurrentStreamingMessageId(assistantMessageId);
      
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
          content: messageContent
        }
      ];
      
      // 调用FastGPT API
      callFastGPT(
        agentConfig.apiKey,
        currentChatId,
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
        },
        (error: Error) => {
          // 处理错误
          console.error("FastGPT API error:", error);
          setMessages(prevMessages => 
            prevMessages.map(msg => 
              msg.id === assistantMessageId 
                ? { ...msg, content: "[请求出错，请稍后再试]" }
                : msg
            )
          );
          setIsLoading(false);
          setCurrentStreamingMessageId(null);
        }
      );
    }
  };

  // 新建对话
  const handleNewChat = () => {
    setMessages([]);
    setChatId(null);
    setCurrentStreamingMessageId(null);
    setInputValue("");
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
        const agentNames = Object.keys(AGENT_CONFIGS);
        const filtered = agentNames.filter(name => 
          name.toLowerCase().includes(searchTerm)
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
      
      // 聚焦输入框并设置光标位置
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          // 设置光标位置到文本末尾
          const length = inputRef.current.value.length;
          inputRef.current.setSelectionRange(length, length);
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
  
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="flex h-screen w-full items-center justify-center bg-zinc-50 dark:bg-zinc-950 font-sans">
      <div className="flex w-full h-full overflow-hidden rounded-none bg-white dark:bg-zinc-900 shadow-2xl border-0 border-zinc-200 dark:border-zinc-800">

        {/* Sidebar */}
        <div className="w-80 bg-zinc-50/50 dark:bg-zinc-900/50 border-r border-zinc-200 dark:border-zinc-800 flex flex-col hidden md:flex">
          {/* Sidebar Header */}
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center">
                <Users className="h-5 w-5 text-white" />
              </div>
              <span className="font-bold text-lg text-zinc-800 dark:text-zinc-100">Team Space</span>
            </div>
            <Button variant="ghost" size="icon" className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
              <Settings className="h-5 w-5" />
            </Button>
          </div>
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
            <Button 
              onClick={handleNewChat}
              className="w-full justify-start gap-2 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              variant="ghost"
            >
              <Plus className="h-4 w-4" />
              New Chat
            </Button>
          </div>
            
          <div className="flex-1 overflow-y-auto p-4">
            <div className="p-4">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
                <Input
                  placeholder="Search agents..."
                  className="pl-9 bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700"
                />
              </div>
            </div>

            {/* Agents List */}
            <ScrollArea className="flex-1 px-2">
              <div className="space-y-1 p-2">
                <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 px-2 mb-2 uppercase tracking-wider">
                  Active Agents
                </div>
                {agents.map((agent) => (
                  <button
                    key={agent.id}
                    className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 transition-colors text-left group"
                  >
                    <div className="relative">
                      <Avatar className="h-10 w-10 border-2 border-white dark:border-zinc-900">
                        <AvatarFallback className={`${agent.color} text-white font-medium`}>
                          {getInitials(agent.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white dark:border-zinc-900 ${agent.status === 'online' ? 'bg-green-500' :
                          agent.status === 'busy' ? 'bg-red-500' : 'bg-zinc-400'
                        }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-zinc-900 dark:text-zinc-100 truncate">
                        {agent.name}
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                        {agent.role}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Stats / Footer */}
          <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-100/50 dark:bg-zinc-900/50">
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-indigo-600 text-white">ME</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">User</p>
                <p className="text-xs text-zinc-500">Online</p>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <LogOut className="h-4 w-4 text-zinc-500" />
              </Button>
            </div>
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col bg-white dark:bg-zinc-950 relative">

          {/* Chat Header */}
          <div className="h-16 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between px-6 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md sticky top-0 z-10">
            <div className="flex items-center gap-3">
              <div className="flex -space-x-2 overflow-hidden">
                {agents.map(agent => (
                  <div key={agent.id} className="h-8 w-8 rounded-full ring-2 ring-white dark:ring-zinc-950 bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-xs border-2 border-white dark:border-zinc-950">
                    {getInitials(agent.name)}
                  </div>
                ))}
                <div className="h-8 w-8 rounded-full ring-2 ring-white dark:ring-zinc-950 bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-xs font-medium text-zinc-500">
                  +1
                </div>
              </div>
              <div className="flex flex-col">
                <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">Multi-Agent Collaboration</h2>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-xs text-zinc-500">3 agents active</span>
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
              <Button variant="ghost" size="icon" className="text-zinc-500">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 px-6 py-6 overflow-y-auto" ref={scrollAreaRef}>
            <div className="space-y-6">
              {messages.length === 0 ? (
                <div className="flex justify-center items-center h-full">
                  <div className="text-center">
                    <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-2">
                      欢迎使用多智能体协作平台
                    </h3>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
                      输入消息，使用@智能体名称来指定智能体
                    </p>
                    <div className="flex flex-col gap-2 text-xs text-zinc-400">
                      <div>@交通助手 - 交通出行相关咨询</div>
                      <div>@酒店管家 - 酒店住宿相关咨询</div>
                      <div>@美食顾问 - 美食餐饮相关咨询</div>
                      <div className="mt-2 text-zinc-500">不指定智能体时，默认使用@酒店管家</div>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((message) => (
                    <div key={message.id} className={`flex gap-3 ${message.isUser ? "flex-row-reverse" : ""}`}>
                      {!message.isUser && (
                        <Avatar className="h-8 w-8 mt-1">
                          <AvatarFallback className={`${message.agentColor} text-white text-xs`}>
                            {getInitials(message.agentName)}
                          </AvatarFallback>
                        </Avatar>
                      )}

                      <div className={`flex flex-col max-w-[70%] ${message.isUser ? "items-end" : "items-start"}`}>
                        <div className="flex items-baseline gap-2 mb-1">
                          <span className={`text-xs font-medium ${message.isUser ? "text-zinc-700 dark:text-zinc-300" : "text-zinc-900 dark:text-zinc-100"}`}>
                            {message.agentName}
                          </span>
                          <span className="text-[10px] text-zinc-400">
                            {formatTime(message.timestamp)}
                          </span>
                        </div>

                        <div className={`
                          px-4 py-2.5 rounded-2xl shadow-sm text-sm leading-relaxed
                          ${message.isUser
                            ? "bg-indigo-600 text-white rounded-tr-sm"
                            : "bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-tl-sm"
                          }
                          break-words overflow-hidden
                        `}>
                          {message.content}
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </ScrollArea>

          {/* Input Area */}
          <div className="p-4 bg-white dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800 relative">
            <div className="relative flex items-center gap-2 bg-zinc-100 dark:bg-zinc-900 p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all">
              <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg">
                <Plus className="h-5 w-5" />
              </Button>

              <Input
                ref={inputRef}
                className="flex-1 bg-transparent border-none shadow-none focus-visible:ring-0 h-9 placeholder:text-zinc-400"
                placeholder="输入消息，使用@智能体名称来指定智能体（如：@交通助手 如何去机场？）"
                value={inputValue}
                onChange={handleInputChange}
                onCompositionStart={() => setIsComposing(true)}
                onCompositionEnd={() => setIsComposing(false)}
                onKeyDown={handleKeyDown}
              />

              <Button
                onClick={handleSend}
                size="icon"
                className={`h-8 w-8 rounded-lg transition-all ${inputValue.trim() && !isLoading
                    ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                    : "bg-zinc-200 dark:bg-zinc-800 text-zinc-400 cursor-not-allowed hover:bg-zinc-200"
                  }`}
                disabled={!inputValue.trim() || isLoading}
              >
                {isLoading ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-white"></div>
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>

            
            {/* 智能体选择列表 */}
            {showAgentList && (
              <div className="absolute bottom-full left-0 mb-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg z-20 max-h-48 overflow-y-auto whitespace-nowrap">
                {filteredAgents.length > 0 ? (
                  filteredAgents.map((agentName) => (
                    <button
                      key={agentName}
                      className="w-full px-3 py-2 text-left hover:bg-zinc-100 dark:hover:bg-zinc-700 flex items-center gap-2 transition-colors"
                      onClick={() => selectAgent(agentName)}
                    >
                      <div className={`h-6 w-6 rounded-full ${AGENT_CONFIGS[agentName as keyof typeof AGENT_CONFIGS]?.color} flex items-center justify-center text-white text-xs`}>
                        {getInitials(agentName)}
                      </div>
                      <span className="text-sm text-zinc-900 dark:text-zinc-100">{agentName}</span>
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-2 text-sm text-zinc-500 dark:text-zinc-400">
                    没有找到匹配的智能体
                  </div>
                )}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
