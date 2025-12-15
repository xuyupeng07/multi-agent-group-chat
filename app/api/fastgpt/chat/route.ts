import { NextRequest, NextResponse } from 'next/server';
import { getAgentApiKey } from '@/lib/fastgpt';

// 调度中心API密钥 - 从环境变量中安全获取
const DISPATCH_CENTER_API_KEY = process.env.FASTGPT_DISPATCH_API_KEY || '';

// FastGPT API 基础URL
const FASTGPT_API_URL = 'https://cloud.fastgpt.io/api/v1/chat/completions';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { agentId, agentName, chatId, messages, stream = false, useDispatchCenter = false } = body;

    if (!chatId || !messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: '缺少必要参数: chatId 或 messages' },
        { status: 400 }
      );
    }

    let apiKey: string;

    if (useDispatchCenter) {
      // 使用调度中心API密钥
      if (!DISPATCH_CENTER_API_KEY) {
        return NextResponse.json(
          { error: '调度中心API密钥未配置，请检查环境变量 FASTGPT_DISPATCH_API_KEY' },
          { status: 500 }
        );
      }
      apiKey = DISPATCH_CENTER_API_KEY;
    } else {
      // 获取智能体API密钥
      const agentApiKey = await getAgentApiKey(agentId, agentName);
      if (!agentApiKey) {
        console.error(`无法获取智能体API密钥: ${agentName || agentId}`);
        return NextResponse.json(
          { error: `无法获取智能体API密钥: ${agentName || agentId}` },
          { status: 404 }
        );
      }
      apiKey = agentApiKey;
    }

    // 准备FastGPT请求
    const fastGPTRequest = {
      chatId,
      stream,
      detail: false,
      messages,
    };

    console.log(`Calling FastGPT API for agent: ${agentName || agentId}, chatId: ${chatId}`);

    // 调用FastGPT API
    const response = await fetch(FASTGPT_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(fastGPTRequest),
    });

    if (!response.ok) {
      console.error('FastGPT API error:', response.status, response.statusText);
      let errorMessage = `FastGPT API error: ${response.status} ${response.statusText}`;
      
      if (response.status === 403) {
        errorMessage = 'API密钥无效或未授权，请检查智能体配置中的API密钥';
      } else if (response.status === 401) {
        errorMessage = 'API密钥认证失败，请检查智能体配置中的API密钥';
      } else if (response.status === 429) {
        errorMessage = '请求过于频繁，请稍后再试';
      } else if (response.status === 500) {
        errorMessage = 'FastGPT服务器内部错误，请稍后再试';
      }
      
      return NextResponse.json(
        { error: errorMessage },
        { status: response.status }
      );
    }

    if (stream) {
      // 流式响应处理
      const reader = response.body?.getReader();
      const encoder = new TextEncoder();
      
      const streamResponse = new ReadableStream({
        async start(controller) {
          try {
            if (!reader) {
              throw new Error('Failed to get response reader');
            }

            while (true) {
              const { done, value } = await reader.read();
              
              if (done) {
                controller.close();
                break;
              }

              const chunk = new TextDecoder().decode(value);
              controller.enqueue(encoder.encode(chunk));
            }
          } catch (error) {
            console.error('Stream processing error:', error);
            controller.error(error);
          }
        },
      });

      return new NextResponse(streamResponse, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    } else {
      // 非流式响应
      const data = await response.json();
      return NextResponse.json(data);
    }
  } catch (error) {
    console.error('FastGPT proxy error:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}