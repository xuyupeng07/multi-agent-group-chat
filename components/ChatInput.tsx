import { useRef, forwardRef, useImperativeHandle, useState, useEffect } from "react";
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

export const ChatInput = forwardRef<{
  focus: () => void;
  setCursorPosition: (position: number) => void;
}, ChatInputProps>(({
  inputValue,
  isLoading,
  isComposing,
  showAgentList,
  filteredAgents,
  onInputChange,
  onSend,
  onKeyDown,
  onCompositionStart,
  onCompositionEnd,
  onSelectAgent
}, ref) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // 当智能体列表变化时重置选中索引
  const prevFilteredAgentsLengthRef = useRef(filteredAgents.length);
  
  useEffect(() => {
    const prevLength = prevFilteredAgentsLengthRef.current;
    const currentLength = filteredAgents.length;
    
    // 只有当智能体列表长度变化且当前长度大于0时才重置索引
    if (prevLength !== currentLength && currentLength > 0) {
      setSelectedIndex(0);
    }
    
    prevFilteredAgentsLengthRef.current = currentLength;
  }, [filteredAgents]);

  // 处理键盘导航
  const handleKeyDownWithNavigation = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showAgentList && filteredAgents.length > 0) {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev < filteredAgents.length - 1 ? prev + 1 : prev
          );
          return;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => prev > 0 ? prev - 1 : 0);
          return;
        case 'Enter':
          e.preventDefault();
          onSelectAgent(filteredAgents[selectedIndex].name);
          return;
        case 'Escape':
          e.preventDefault();
          // 让父组件处理关闭
          onKeyDown(e);
          return;
      }
    }
    
    // 其他按键交给父组件处理
    onKeyDown(e);
  };

  // 暴露方法给父组件
  useImperativeHandle(ref, () => ({
    focus: () => {
      inputRef.current?.focus();
    },
    setCursorPosition: (position: number) => {
      if (inputRef.current) {
        inputRef.current.setSelectionRange(position, position);
        inputRef.current.focus();
      }
    }
  }));

  return (
    <div className="relative border-t border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md p-4">
      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={onInputChange}
            onKeyDown={handleKeyDownWithNavigation}
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
            selectedIndex={selectedIndex}
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
});

ChatInput.displayName = 'ChatInput';