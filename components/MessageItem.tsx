import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AgentAvatar } from "@/components/AgentAvatar";
import { cn } from "@/lib/utils";
import { Message, Agent } from "@/types/chat";
import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";

interface MessageItemProps {
  message: Message;
  agents?: Agent[];
}

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

// 自定义组件用于渲染段落，保留@智能体的高亮样式
const ParagraphRenderer = ({ children, isUserMessage }: { children: React.ReactNode; isUserMessage: boolean }) => {
  // 处理@智能体的高亮
  const processChildren = (children: React.ReactNode) => {
    if (typeof children === 'string') {
      return parseMessageContent(children, isUserMessage);
    }
    
    if (Array.isArray(children)) {
      return children.map((child, index) => {
        if (typeof child === 'string') {
          return <React.Fragment key={index}>{parseMessageContent(child, isUserMessage)}</React.Fragment>;
        }
        return child;
      });
    }
    
    return children;
  };
  
  return <p>{processChildren(children)}</p>;
};

// 解析消息内容，将@智能体部分转换为带有特殊样式的元素
const parseMessageContent = (content: string, isUserMessage: boolean) => {
  // 使用正则表达式匹配@智能体部分
  const mentionRegex = /@(\S+)/g;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = mentionRegex.exec(content)) !== null) {
    // 添加@符号之前的部分
    if (match.index > lastIndex) {
      parts.push(content.substring(lastIndex, match.index));
    }
    
    // 添加@智能体部分，带有特殊样式
    // 用户消息使用黄色，AI消息使用蓝色
    const mentionColor = isUserMessage ? "text-yellow-300" : "text-blue-500";
    parts.push(
      <span key={match.index} className={`font-bold ${mentionColor}`}>
        {match[0]}
      </span>
    );
    
    lastIndex = mentionRegex.lastIndex;
  }
  
  // 添加最后一部分
  if (lastIndex < content.length) {
    parts.push(content.substring(lastIndex));
  }
  
  return parts;
};

export function MessageItem({ message, agents = [] }: MessageItemProps) {
  // 查找当前消息对应的智能体信息
  const currentAgent = agents.find(agent => agent.name === message.agentName);
  
  return (
    <div className={`flex gap-3 ${message.isUser ? "flex-row-reverse" : ""}`}>
      {/* 用户头像 */}
      {message.isUser && (
        <Avatar className="h-8 w-8 mt-1">
          <img
            src="/fastgpt.png"
            alt="user"
            className="h-full w-full rounded-full object-cover bg-white border-2 border-slate-200 dark:border-slate-700"
          />
        </Avatar>
      )}
      
      {/* AI头像 */}
      {!message.isUser && (
        <>
          {currentAgent ? (
            <AgentAvatar agent={currentAgent} size="sm" />
          ) : (
            // 调度中心或其他没有对应Agent的消息使用默认头像
            <Avatar className="h-8 w-8 mt-1">
              {message.agentName === "调度中心" ? (
                <AvatarImage src="/调度中心.png" alt="调度中心" className="object-cover object-center" />
              ) : null}
              <AvatarFallback className="bg-gray-500 text-white">
                {message.agentName === "调度中心" ? "调" : getInitials(message.agentName)}
              </AvatarFallback>
            </Avatar>
          )}
        </>
      )}

      <div className={`flex flex-col max-w-[70%] ${message.isUser ? "items-end" : "items-start"}`}>
        <div className={`flex items-baseline gap-2 mb-1 ${message.isUser ? "justify-end" : "justify-start"}`}>
          {!message.isUser && (
            <span className="text-xs font-medium text-zinc-900 dark:text-zinc-100">
              {message.agentName}
            </span>
          )}
          <span className="text-[10px] text-zinc-400">
            {formatTime(message.timestamp)}
          </span>
        </div>

        <div className={`
          px-4 py-2.5 rounded-2xl shadow-sm text-sm leading-relaxed relative
          ${message.isUser
            ? "bg-indigo-600 text-white rounded-tr-sm"
            : message.isThinking
            ? "bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 text-zinc-900 dark:text-zinc-100 rounded-tl-sm border border-blue-200 dark:border-blue-700"
            : "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-tl-sm border border-zinc-200 dark:border-zinc-700"
          }
        `}>
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeHighlight]}
            components={{
              p: ({ children }) => <ParagraphRenderer isUserMessage={message.isUser}>{children}</ParagraphRenderer>,
              code: ({ inline, className, children, ...props }: any) => {
                const match = /language-(\w+)/.exec(className || '');
                return !inline && match ? (
                  <pre className="bg-zinc-900 dark:bg-zinc-950 rounded-md p-2 overflow-x-auto my-2">
                    <code className={className} {...props}>
                      {children}
                    </code>
                  </pre>
                ) : (
                  <code className="bg-zinc-200 dark:bg-zinc-700 px-1 py-0.5 rounded text-xs font-mono" {...props}>
                    {children}
                  </code>
                );
              },
              blockquote: ({ children }) => (
                <blockquote className="border-l-4 border-zinc-300 dark:border-zinc-600 pl-4 italic my-2">
                  {children}
                </blockquote>
              ),
              table: ({ children }) => (
                <div className="overflow-x-auto my-2">
                  <table className="min-w-full border-collapse border border-zinc-300 dark:border-zinc-600">
                    {children}
                  </table>
                </div>
              ),
              th: ({ children }) => (
                <th className="border border-zinc-300 dark:border-zinc-600 px-2 py-1 bg-zinc-100 dark:bg-zinc-700 font-semibold">
                  {children}
                </th>
              ),
              td: ({ children }) => (
                <td className="border border-zinc-300 dark:border-zinc-600 px-2 py-1">
                  {children}
                </td>
              ),
              ul: ({ children }) => (
                <ul className="list-disc list-inside my-2">
                  {children}
                </ul>
              ),
              ol: ({ children }) => (
                <ol className="list-decimal list-inside my-2">
                  {children}
                </ol>
              ),
              a: ({ href, children }) => (
                <a 
                  href={href} 
                  className="text-blue-500 dark:text-blue-400 underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {children}
                </a>
              ),
              h1: ({ children }) => (
                <h1 className="text-lg font-bold mt-3 mb-2">
                  {children}
                </h1>
              ),
              h2: ({ children }) => (
                <h2 className="text-base font-bold mt-2 mb-1">
                  {children}
                </h2>
              ),
              h3: ({ children }) => (
                <h3 className="text-sm font-bold mt-2 mb-1">
                  {children}
                </h3>
              ),
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>

        {/* 如果是思考状态，覆盖显示思考动画 */}
        {message.isThinking && (
          <div className="absolute inset-0 flex items-center justify-center px-4 py-2.5">
            <div className="flex items-center gap-2">
              <span className="text-zinc-600 dark:text-zinc-400 text-sm">思考中</span>
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}