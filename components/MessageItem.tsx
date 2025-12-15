import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Message } from "@/types/chat";
import React from "react";

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
          {parseMessageContent(message.content, message.isUser)}
        </div>
      </div>
    </div>
  );
}