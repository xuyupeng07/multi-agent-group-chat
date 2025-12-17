import { forwardRef } from "react";

interface SuggestionBubblesProps {
  onSuggestionClick: (suggestion: string) => void;
}

export const SuggestionBubbles = forwardRef<HTMLDivElement, SuggestionBubblesProps>(
  ({ onSuggestionClick }, ref) => {
    const suggestions = [
      "重新生成回答",
      "使用提示建议",
      "用简单的话解释",
      "用三行总结",
      "翻译内容"
    ];

    const suggestionCommands = [
      "请重新生成你的回答",
      "给我一些关于这个话题的提示建议",
      "请用简单的话解释这个概念",
      "请用三行总结主要内容",
      "请将以下内容翻译成中文"
    ];

    const handleSuggestionClick = (index: number) => {
      onSuggestionClick(suggestionCommands[index]);
    };

    return (
      <div 
        ref={ref}
        className="mt-4 mb-2 mx-4 flex w-full gap-x-2 overflow-x-auto whitespace-nowrap text-xs text-slate-600 dark:text-slate-300 sm:text-sm"
      >
        {suggestions.map((suggestion, index) => (
          <button
            key={index}
            onClick={() => handleSuggestionClick(index)}
            className="rounded-lg bg-slate-100 p-2 hover:bg-blue-100 hover:text-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 dark:hover:text-slate-200 transition-colors duration-200"
          >
            {suggestion}
          </button>
        ))}
      </div>
    );
  }
);

SuggestionBubbles.displayName = "SuggestionBubbles";