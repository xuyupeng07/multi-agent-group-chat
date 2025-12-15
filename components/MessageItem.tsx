import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Message } from "@/types/chat";

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
          {message.content}
        </div>
      </div>
    </div>
  );
}