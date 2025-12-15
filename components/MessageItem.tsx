import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Message } from "@/types/chat";
import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";

interface MessageItemProps {
  message: Message;
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

export function MessageItem({ message }: MessageItemProps) {
  return (
    <div className={`flex gap-3 ${message.isUser ? "flex-row-reverse" : ""}`}>
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
      </div>
    </div>
  );
}