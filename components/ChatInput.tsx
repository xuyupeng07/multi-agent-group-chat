import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send } from "lucide-react";
import { Agent } from "@/types/chat";
import { AgentList } from "./AgentList";

interface ChatInputProps {
  inputValue: string;
  isLoading: boolean;
  isComposing: boolean;
  showAgentList: boolean;
  filteredAgents: Agent[];
  mentionStartIndex: number | null;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSend: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onCompositionStart: () => void;
  onCompositionEnd: () => void;
  onSelectAgent: (agentName: string) => void;
}

export function ChatInput({
  inputValue,
  isLoading,
  isComposing,
  showAgentList,
  filteredAgents,
  mentionStartIndex,
  onInputChange,
  onSend,
  onKeyDown,
  onCompositionStart,
  onCompositionEnd,
  onSelectAgent
}: ChatInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="relative border-t border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md p-4">
      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={onInputChange}
            onKeyDown={onKeyDown}
            onCompositionStart={onCompositionStart}
            onCompositionEnd={onCompositionEnd}
            placeholder="输入消息，使用@智能体名称来指定智能体..."
            className="bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 pr-12"
            disabled={isLoading}
          />
          <AgentList
            show={showAgentList}
            filteredAgents={filteredAgents}
            onSelectAgent={onSelectAgent}
          />
        </div>
        <Button
          onClick={onSend}
          disabled={!inputValue.trim() || isComposing || isLoading}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}