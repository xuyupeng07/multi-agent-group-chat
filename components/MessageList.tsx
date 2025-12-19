import { ScrollArea } from "@/components/ui/scroll-area";
import { Message } from "@/types/chat";
import { Agent } from "@/types/chat";
import { MessageItem } from "./MessageItem";
import { RefObject } from "react";

interface MessageListProps {
  messages: Message[];
  scrollAreaRef: RefObject<HTMLDivElement | null>;
  agents?: Agent[];
}

export function MessageList({ messages, scrollAreaRef, agents = [] }: MessageListProps) {
  return (
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
                <div className="mt-2 text-zinc-500">在未指定智能体的情况下，调度中心将自动为您匹配最适合解答当前问题的智能体。</div>
              </div>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <MessageItem key={message.id} message={message} agents={agents} />
            ))}
          </>
        )}
      </div>
    </ScrollArea>
  );
}