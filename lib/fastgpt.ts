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

// 调度中心API密钥 - 已移至后端，此处仅作注释参考
// const DISPATCH_CENTER_API_KEY = 'fastgpt-yo7VV9ZJkKBi22QL8DP4hW02PtNuDd0hUOW7H8F6Nf8Z4BqATYUosS8NUBZhNc';

// 调度中心响应类型
export interface DispatchCenterResponse {
  id: string;
  model: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
    index: number;
  }>;
}

// 智能体配置 - 从数据库获取
export let AGENT_CONFIGS: Record<string, { apiKey: string; name: string; color: string; id?: string }> = {
  // 默认配置，当数据库加载失败时使用（空配置）
};

// 从数据库加载智能体配置
export async function loadAgentConfigs() {
  try {
    const response = await fetch('/api/agents');
    if (response.ok) {
      const agents = await response.json();
      AGENT_CONFIGS = agents.reduce((configs: Record<string, any>, agent: any) => {
        configs[agent.name] = {
          apiKey: agent.apiKey,
          name: agent.name,
          color: agent.color,
          id: agent.id
        };
        return configs;
      }, {});
      console.log('Successfully loaded agent configs from database:', Object.keys(AGENT_CONFIGS));
    } else {
      console.warn('Failed to load agent configs from database, using default configs:', response.status);
    }
  } catch (error) {
    console.error('Failed to load agent configs from database, using default configs:', error);
  }
};

// 调用调度中心API - 现在通过后端代理
export async function callDispatchCenter(
  chatId: string,
  messages: FastGPTMessage[]
): Promise<DispatchCenterResponse> {
  try {
    console.log('Calling Dispatch Center API with chatId:', chatId);
    
    const response = await fetch('/api/fastgpt/dispatch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chatId,
        messages,
      }),
    });

    if (!response.ok) {
      console.error('Dispatch Center API error response:', response.status, response.statusText);
      throw new Error(`Dispatch Center API error: ${response.status} ${response.statusText}`);
    }
    
    const data: DispatchCenterResponse = await response.json();
    console.log('Dispatch Center API response received:', data);
    return data;
  } catch (error) {
    console.error('Failed to call Dispatch Center API:', error);
    throw error;
  }
}

// 根据ID或名称获取智能体API密钥
export async function getAgentApiKey(agentId?: string, agentName?: string): Promise<string | null> {
  try {
    // 特殊处理：当ID为空且名称为旅行管家时，返回旅行管家的API密钥
    if ((!agentId || agentId === '') && agentName === '旅行管家') {
      console.log(`Using travel butler API key`);
      return 'fastgpt-lAf0Gg6mtMaApu0gsA0vzK6nWEa8eD5gPMLVD1CdeD0ysIEtWLjBsPt';
    }
    
    // 确保最新的智能体配置已加载
    await loadAgentConfigs();
    
    // 优先通过ID匹配
    if (agentId) {
      for (const agentName in AGENT_CONFIGS) {
        const config = AGENT_CONFIGS[agentName];
        if (config.id === agentId) {
          console.log(`Found agent by ID: ${agentId}, name: ${agentName}`);
          return config.apiKey;
        }
      }
    }
    
    // 如果ID匹配失败，尝试通过名称匹配
    if (agentName && AGENT_CONFIGS[agentName]) {
      console.log(`Found agent by name: ${agentName}`);
      return AGENT_CONFIGS[agentName].apiKey;
    }
    
    console.log(`Agent not found. ID: ${agentId}, Name: ${agentName}`);
    return null;
  } catch (error) {
    console.error('Error getting agent API key:', error);
    return null;
  }
}

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

// 从文本中移除@部分（保留@智能体，仅移除多余的@）
export function removeMentionFromText(text: string): string {
  // 不再移除@部分，直接返回原文本
  return text.trim();
}

// FastGPT API 调用函数 - 现在通过后端代理
export async function callFastGPT(
  agentId: string | undefined,
  agentName: string | undefined,
  chatId: string,
  messages: FastGPTMessage[],
  onChunk: (chunk: string) => void,
  onComplete: () => void,
  onError: (error: Error) => void
) {
  try {
    console.log('Calling FastGPT API with chatId:', chatId);
    console.log('Agent:', agentName || agentId);
    console.log('Messages count:', messages.length);
    
    const response = await fetch('/api/fastgpt/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        agentId,
        agentName,
        chatId,
        stream: true,
        messages,
      }),
    });

    if (!response.ok) {
      console.error('FastGPT API error response:', response.status, response.statusText);
      let errorMessage = `HTTP error! status: ${response.status}, statusText: ${response.statusText}`;
      
      if (response.status === 403) {
        errorMessage = 'API密钥无效或未授权，请检查智能体配置中的API密钥';
      } else if (response.status === 401) {
        errorMessage = 'API密钥认证失败，请检查智能体配置中的API密钥';
      } else if (response.status === 429) {
        errorMessage = '请求过于频繁，请稍后再试';
      } else if (response.status === 500) {
        errorMessage = 'FastGPT服务器内部错误，请稍后再试';
      }
      
      throw new Error(errorMessage);
    }
    
    console.log('FastGPT API response received, starting stream processing...');

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
              console.log('Received chunk:', data.choices[0].delta.content);
              onChunk(data.choices[0].delta.content);
            }
            
            if (data.choices[0]?.finish_reason === 'stop') {
              console.log('Stream completed with stop reason');
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