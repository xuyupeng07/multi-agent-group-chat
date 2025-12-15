import { ScrollArea } from "@/components/ui/scroll-area";
import { Message } from "@/types/chat";
import { MessageItem } from "./MessageItem";
import { RefObject } from "react";

interface MessageListProps {
  messages: Message[];
  scrollAreaRef: RefObject<HTMLDivElement | null>;
}

export function MessageList({ messages, scrollAreaRef }: MessageListProps) {
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
                <div>@旅行管家 - 全面旅行相关咨询</div>
                <div>@交通助手 - 交通出行相关咨询</div>
                <div>@酒店管家 - 酒店住宿相关咨询</div>
                <div>@美食顾问 - 美食餐饮相关咨询</div>
                <div className="mt-2 text-zinc-500">不指定智能体时，默认使用@旅行管家</div>
              </div>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <MessageItem key={message.id} message={message} />
            ))}
          </>
        )}
      </div>
    </ScrollArea>
  );
}