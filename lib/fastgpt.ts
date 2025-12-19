// FastGPT API 服务
import { withRetry, withTimeout } from './errorHandling';

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
    // 在服务器端和客户端使用不同的URL
    const isServer = typeof window === 'undefined';
    const agentsUrl = isServer ? 
      `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/agents` : 
      '/api/agents';
    
    // 使用重试和超时机制
    const response = await withRetry(
      () => withTimeout(
        fetch(agentsUrl),
        10000, // 10秒超时
        new Error('加载智能体配置超时')
      ),
      3, // 最多重试3次
      1000 // 初始延迟1秒
    );
    
    if (response.ok) {
      const agents = await response.json();
      AGENT_CONFIGS = agents.reduce((configs: Record<string, {
        apiKey: string;
        name: string;
        color: string;
        id: string;
      }>, agent: {
        _id: string;
        name: string;
        role: string;
        introduction: string;
        apiKey: string;
        color: string;
        status: string;
        baseUrl: string;
      }) => {
        configs[agent.name] = {
          apiKey: agent.apiKey,
          name: agent.name,
          color: agent.color,
          id: agent._id.toString() // 使用MongoDB的_id
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
  console.log('Calling Dispatch Center API with chatId:', chatId);
  
  // 使用重试和超时机制
  const response = await withRetry(
    () => withTimeout(
      fetch('/api/fastgpt/dispatch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chatId,
          messages,
        }),
      }),
      15000, // 15秒超时
      new Error('调度中心请求超时')
    ),
    2, // 最多重试2次
    2000 // 初始延迟2秒
  );

  if (!response.ok) {
    console.error('Dispatch Center API error response:', response.status, response.statusText);
    throw new Error(`Dispatch Center API error: ${response.status} ${response.statusText}`);
  }
  
  const data: DispatchCenterResponse = await response.json();
  console.log('Dispatch Center API response received:', data);
  return data;
}

// 调用讨论模式调度中心API - 通过API路由调用
export async function callDiscussionDispatchCenter(
  chatId: string,
  messages: FastGPTMessage[],
  groupId?: string,
  discuss: boolean = true, // 默认为true，表示开启讨论模式
  signal?: AbortSignal
): Promise<DispatchCenterResponse> {
  try {
    console.log('Calling Discussion Dispatch Center API with chatId:', chatId, 'discuss:', discuss);
    
    // 准备讨论模式调度中心请求
    const dispatchRequest = {
      chatId,
      messages,
      groupId,
      discuss
    };
    
    console.log('Dispatch request payload:', JSON.stringify(dispatchRequest, null, 2));
    
    // 在服务器端和客户端使用不同的URL
    const isServer = typeof window === 'undefined';
    const apiUrl = isServer ? 
      `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/fastgpt/discussion-dispatch` : 
      '/api/fastgpt/discussion-dispatch';
    
    // 使用重试和超时机制
    const response = await withRetry(
      () => withTimeout(
        fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(dispatchRequest),
          signal, // 传递 AbortSignal
        }),
        15000, // 15秒超时
        new Error('讨论调度中心请求超时')
      ),
      2, // 最多重试2次
      2000 // 初始延迟2秒
    );

    if (!response.ok) {
      console.error('Discussion Dispatch Center API error response:', response.status, response.statusText);
      throw new Error(`Discussion Dispatch Center API error: ${response.status} ${response.statusText}`);
    }
    
    const data: DispatchCenterResponse = await response.json();
    console.log('Discussion Dispatch Center API response received:', data);
    return data;
  } catch (error) {
    // 如果是中止错误，不抛出异常
    if (error instanceof Error && error.name === 'AbortError') {
      console.log('讨论调度中心请求被用户中止');
      throw error;
    }
    console.error('Failed to call Discussion Dispatch Center API:', error);
    throw error;
  }
}

// 根据ID或名称获取智能体API密钥
export async function getAgentApiKey(agentId?: string, agentName?: string): Promise<string | null> {
  try {
    // 确保最新的智能体配置已加载
    await loadAgentConfigs();
    
    console.log(`Looking for agent with ID: ${agentId}, Name: ${agentName}`);
    console.log(`Available agents:`, Object.keys(AGENT_CONFIGS));
    
    // 优先通过ID匹配
    if (agentId) {
      for (const agentName in AGENT_CONFIGS) {
        const config = AGENT_CONFIGS[agentName];
        if (config.id === agentId) {
          console.log(`Found agent by ID: ${agentId}, name: ${agentName}, API key: ${config.apiKey ? 'exists' : 'missing'}`);
          return config.apiKey;
        }
      }
    }
    
    // 如果ID匹配失败，尝试通过名称匹配
    if (agentName && AGENT_CONFIGS[agentName]) {
      console.log(`Found agent by name: ${agentName}, API key: ${AGENT_CONFIGS[agentName].apiKey ? 'exists' : 'missing'}`);
      return AGENT_CONFIGS[agentName].apiKey;
    }
    
    // 如果ID和名称都匹配失败，使用默认智能体ID: 6940567f484105cda2d631f5
    console.log(`Agent not found. ID: ${agentId}, Name: ${agentName}. Using default agent ID: 6940567f484105cda2d631f5`);
    for (const agentName in AGENT_CONFIGS) {
      const config = AGENT_CONFIGS[agentName];
      if (config.id === "6940567f484105cda2d631f5") {
        console.log(`Found default agent by ID: 6940567f484105cda2d631f5, name: ${agentName}, API key: ${config.apiKey ? 'exists' : 'missing'}`);
        return config.apiKey;
      }
    }
    
    console.log(`Default agent not found. ID: ${agentId}, Name: ${agentName}`);
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
  onError: (error: Error) => void,
  signal?: AbortSignal
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
      signal, // 传递 AbortSignal
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
      // 检查是否已中止
      if (signal?.aborted) {
        console.log('请求已被中止');
        return;
      }
      
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
          } catch {
            // 忽略解析错误
            console.warn('Failed to parse chunk:', dataStr);
          }
        }
      }
    }
  } catch (error) {
    // 如果是中止错误，不调用 onError
    if (error instanceof Error && error.name === 'AbortError') {
      console.log('请求被用户中止');
      return;
    }
    onError(error as Error);
  }
}