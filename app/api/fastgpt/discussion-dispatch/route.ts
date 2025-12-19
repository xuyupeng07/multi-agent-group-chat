import { NextRequest, NextResponse } from 'next/server';

// 讨论模式调度中心API密钥 - 从环境变量中安全获取
const DISCUSSION_DISPATCH_API_KEY = process.env.FASTGPT_DISPATCH_API_KEY || '';

// FastGPT API 基础URL
const FASTGPT_API_URL = 'https://cloud.fastgpt.io/api/v1/chat/completions';

export async function POST(request: NextRequest) {
  try {
    // 检查调度中心API密钥是否配置
    if (!DISCUSSION_DISPATCH_API_KEY) {
      return NextResponse.json(
        { error: '调度中心API密钥未配置，请检查环境变量 FASTGPT_DISPATCH_API_KEY' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { chatId, messages, groupId, discuss } = body;

    if (!chatId || !messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: '缺少必要参数: chatId 或 messages' },
        { status: 400 }
      );
    }

    // 准备讨论模式调度中心请求
    const dispatchRequest = {
      chatId,
      stream: false,
      detail: false,
      variables: {
        group_id: groupId || "",
        discuss: discuss !== undefined ? discuss : true // 默认为true，表示开启讨论模式
      },
      messages,
    };

    console.log('Calling Discussion Dispatch Center API with chatId:', chatId, 'discuss:', discuss);

    // 调用讨论模式调度中心API
    const response = await fetch(FASTGPT_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DISCUSSION_DISPATCH_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(dispatchRequest),
    });

    if (!response.ok) {
      console.error('Discussion Dispatch Center API error:', response.status, response.statusText);
      return NextResponse.json(
        { error: `讨论模式调度中心API错误: ${response.status} ${response.statusText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('Discussion Dispatch Center API response received');
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Discussion Dispatch Center proxy error:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}