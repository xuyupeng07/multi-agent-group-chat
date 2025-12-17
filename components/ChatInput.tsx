import { useRef, forwardRef, useImperativeHandle, useState, useEffect } from "react";
import { Agent } from "@/types/chat";
import { AgentList } from "./AgentList";
import { Button } from "@/components/ui/button";
import { Pause, Play } from "lucide-react";

interface ChatInputProps {
  inputValue: string;
  isLoading: boolean;
  isComposing: boolean;
  showAgentList: boolean;
  filteredAgents: Agent[];
  mentionStartIndex: number | null;
  isDiscussionMode?: boolean;
  discussionPaused?: boolean;
  discussionCompleted?: boolean;
  onPauseDiscussion?: () => void;
  onResumeDiscussion?: () => void;
  onInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onSend: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
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
  mentionStartIndex,
  isDiscussionMode = false,
  discussionPaused = false,
  discussionCompleted = false,
  onPauseDiscussion,
  onResumeDiscussion,
  onInputChange,
  onSend,
  onKeyDown,
  onCompositionStart,
  onCompositionEnd,
  onSelectAgent
}, ref) => {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [recognitionSuccess, setRecognitionSuccess] = useState(false);
  const recognitionRef = useRef<any>(null);
  const inputValueRef = useRef<string>(inputValue);
  
  // 更新 inputValueRef
  useEffect(() => {
    inputValueRef.current = inputValue;
  }, [inputValue]);

  // 初始化语音识别
  useEffect(() => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window && !recognitionRef.current) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'zh-CN';
      recognition.maxAlternatives = 1;

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        onInputChange({ target: { value: transcript } } as React.ChangeEvent<HTMLTextAreaElement>);
        setIsRecording(false);
      };

      recognition.onerror = (event: any) => {
        console.error('语音识别错误:', event.error);
        setIsRecording(false);
        
        // 根据错误类型提供用户反馈
        if (event.error === 'no-speech') {
          console.log('未检测到语音');
        } else if (event.error === 'audio-capture') {
          console.log('无法捕获音频');
        } else if (event.error === 'not-allowed') {
          console.log('麦克风权限被拒绝');
        } else if (event.error === 'network') {
          console.log('网络错误');
        }
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
    }

    // 清理函数
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {
          // 忽略清理时的错误
        }
      }
    };
  }, [onInputChange]);

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
  const handleKeyDownWithNavigation = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
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
          if (!e.shiftKey) {
            e.preventDefault();
            onSelectAgent(filteredAgents[selectedIndex].name);
            return;
          }
          break;
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

  // 处理语音输入
  const handleVoiceInput = () => {
    if (!recognitionRef.current) {
      alert('您的浏览器不支持语音识别功能');
      return;
    }

    try {
      if (isRecording) {
        recognitionRef.current.stop();
        setIsRecording(false);
      } else {
        // 创建新的识别实例，避免状态冲突
        const SpeechRecognition = (window as any).webkitSpeechRecognition;
        const newRecognition = new SpeechRecognition();
        newRecognition.continuous = false;
        newRecognition.interimResults = false;
        newRecognition.lang = 'zh-CN';
        newRecognition.maxAlternatives = 1;

        newRecognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          console.log('语音识别结果:', transcript);
          
          // 使用 ref 获取最新的输入值，将识别结果追加到现有内容后面
          const currentValue = inputValueRef.current;
          const newValue = currentValue ? `${currentValue} ${transcript}` : transcript;
          onInputChange({ target: { value: newValue } } as React.ChangeEvent<HTMLTextAreaElement>);
          
          // 显示成功反馈
          setRecognitionSuccess(true);
          setTimeout(() => setRecognitionSuccess(false), 500);
          
          setIsRecording(false);
        };

        newRecognition.onerror = (event: any) => {
          console.error('语音识别错误:', event.error);
          setIsRecording(false);
          
          if (event.error === 'no-speech') {
            console.log('未检测到语音');
            alert('未检测到语音，请重试');
          } else if (event.error === 'audio-capture') {
            console.log('无法捕获音频');
            alert('无法捕获音频，请检查麦克风是否正常工作');
          } else if (event.error === 'not-allowed') {
            console.log('麦克风权限被拒绝');
            alert('麦克风权限被拒绝，请在浏览器设置中允许麦克风访问');
          } else if (event.error === 'network') {
            console.log('网络错误，请检查网络连接');
            alert('语音识别需要网络连接。如果问题持续存在，可能是由于浏览器限制或网络防火墙导致的。请尝试：\n1. 检查网络连接\n2. 使用Chrome浏览器\n3. 确保没有防火墙阻止语音识别服务');
          } else {
            alert(`语音识别失败: ${event.error}`);
          }
        };

        newRecognition.onend = () => {
          setIsRecording(false);
        };

        newRecognition.start();
        setIsRecording(true);
        recognitionRef.current = newRecognition;
      }
    } catch (error) {
      console.error('语音识别操作失败:', error);
      setIsRecording(false);
    }
  };

  // 自动调整文本框高度
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onInputChange(e);
    
    // 自动调整高度
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
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
      {/* 讨论模式控制按钮 */}
      {isDiscussionMode && (
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm text-zinc-600 dark:text-zinc-400">
            讨论模式 {discussionCompleted ? "(已完成)" : discussionPaused ? "(已暂停)" : "(进行中)"}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={discussionPaused || discussionCompleted ? onResumeDiscussion : onPauseDiscussion}
            className="flex items-center gap-2"
          >
            {discussionPaused || discussionCompleted ? (
              <>
                <Play className="h-4 w-4" />
                继续讨论
              </>
            ) : (
              <>
                <Pause className="h-4 w-4" />
                暂停讨论
              </>
            )}
          </Button>
        </div>
      )}
      <form onSubmit={(e) => { e.preventDefault(); onSend(); }}>
        <label htmlFor="chat-input" className="sr-only">Enter your prompt</label>
        <div className="relative">
          <button
            type="button"
            className={`absolute inset-y-0 left-0 flex items-center pl-3 transition-colors duration-200 ${isRecording ? 'text-red-600 animate-pulse' : 'text-slate-500 hover:text-blue-600'}`}
            onClick={handleVoiceInput}
            disabled={isLoading}
            title={isRecording ? '点击停止录音' : '点击开始语音输入'}
          >
            <svg
              aria-hidden="true"
              className={`h-5 w-5 ${isRecording ? 'animate-pulse' : ''}`}
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
              strokeWidth="2"
              stroke="currentColor"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
              <path
                d="M9 2m0 3a3 3 0 0 1 3 -3h0a3 3 0 0 1 3 3v5a3 3 0 0 1 -3 3h0a3 3 0 0 1 -3 -3z"
              ></path>
              <path d="M5 10a7 7 0 0 0 14 0"></path>
              <path d="M8 21l8 0"></path>
              <path d="M12 17l0 4"></path>
            </svg>
            <span className="sr-only">{isRecording ? '停止录音' : '使用语音输入'}</span>
          </button>
          <textarea
            ref={inputRef}
            id="chat-input"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDownWithNavigation}
            onCompositionStart={onCompositionStart}
            onCompositionEnd={onCompositionEnd}
            className={`block w-full resize-none rounded-lg border border-gray-300 bg-white p-4 pl-10 pr-20 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-base transition-all duration-200 scrollbar-hide ${recognitionSuccess ? 'ring-2 ring-green-500 bg-green-50' : ''}`}
            placeholder="输入消息，使用@智能体名称来指定智能体..."
            rows={1}
            disabled={isLoading}
            required
          />
          <button
            type="submit"
            className="absolute bottom-2 right-2.5 flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-300 sm:text-base"
            disabled={!inputValue.trim() || isComposing || isLoading}
          >
            <svg
              aria-hidden="true"
              className="h-5 w-5"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
              strokeWidth="2"
              stroke="currentColor"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
              <path d="M3 3l18 9l-18 9l3 -9l-3 -9z"></path>
              <path d="M6 12l3 -3l7.5 7.5"></path>
            </svg>
            Send <span className="sr-only">Send message</span>
          </button>
        </div>
        <AgentList
          show={showAgentList}
          filteredAgents={filteredAgents}
          onSelectAgent={onSelectAgent}
          selectedIndex={selectedIndex}
        />
      </form>
    </div>
  );
});

ChatInput.displayName = 'ChatInput';