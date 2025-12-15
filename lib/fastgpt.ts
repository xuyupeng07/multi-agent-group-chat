// FastGPT API 服务
export interface FastGPTMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface FastGPTRequest {
  chatId: string;
  stream: boolean;
  detail: boolean;
  messages: FastGPTMessage[];
}

export interface FastGPTStreamResponse {
  id: string;
  object: string;
  created: number;
  choices: Array<{
    delta: {
      content: string;
    };
    index: number;
    finish_reason: string | null;
  }>;
}

export interface FastGPTAgent {
  id: string;
  name: string;
  role: string;
  status: "online" | "busy" | "offline";
  color: string;
  avatar?: string;
  apiKey: string;
  shareId?: string;
}

// 智能体配置
export const AGENT_CONFIGS = {
  "旅行管家": {
    apiKey: process.env.NEXT_PUBLIC_FASTGPT_TRAVEL_KEY || "",
    name: "旅行管家",
    color: "bg-orange-500"
  },
  "交通助手": {
    apiKey: process.env.NEXT_PUBLIC_FASTGPT_TRAFFIC_KEY || "",
    name: "交通助手",
    color: "bg-blue-500"
  },
  "酒店管家": {
    apiKey: process.env.NEXT_PUBLIC_FASTGPT_HOTEL_KEY || "",
    name: "酒店管家",
    color: "bg-green-500"
  },
  "美食顾问": {
    apiKey: process.env.NEXT_PUBLIC_FASTGPT_FOOD_KEY || "",
    name: "美食顾问",
    color: "bg-purple-500"
  }
};

// 从文本中提取@的智能体
export function extractMentionedAgent(text: string): string | null {
  const mentionRegex = /@(\S+)/g;
  const matches = text.match(mentionRegex);
  
  if (!matches || matches.length === 0) {
    return null;
  }
  
  // 提取智能体名称
  const agentName = matches[0].substring(1); // 移除@符号
  
  // 检查是否是有效的智能体
  if (AGENT_CONFIGS[agentName as keyof typeof AGENT_CONFIGS]) {
    return agentName;
  }
  
  return null;
}

// 从文本中移除@部分
export function removeMentionFromText(text: string): string {
  return text.replace(/@\S+/g, '').trim();
}

// FastGPT API 调用函数
export async function callFastGPT(
  apiKey: string,
  chatId: string,
  messages: FastGPTMessage[],
  onChunk: (chunk: string) => void,
  onComplete: () => void,
  onError: (error: Error) => void
) {
  try {
    const response = await fetch('https://cloud.fastgpt.io/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chatId,
        stream: true,
        detail: false,
        messages,
      } as FastGPTRequest),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      throw new Error('Failed to get response reader');
    }

    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        onComplete();
        break;
      }

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const dataStr = line.substring(6);
          
          if (dataStr === '[DONE]') {
            onComplete();
            return;
          }

          try {
            const data: FastGPTStreamResponse = JSON.parse(dataStr);
            
            if (data.choices && data.choices[0] && data.choices[0].delta.content) {
              onChunk(data.choices[0].delta.content);
            }
            
            if (data.choices[0]?.finish_reason === 'stop') {
              onComplete();
              return;
            }
          } catch (e) {
            // 忽略解析错误
            console.warn('Failed to parse chunk:', dataStr);
          }
        }
      }
    }
  } catch (error) {
    onError(error as Error);
  }
}