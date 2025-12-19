import { NextRequest, NextResponse } from 'next/server';
import { connectMongoDB, Chat } from '@/lib/mongodb';

// 获取所有聊天记录列表
export async function GET() {
  let connectionAttempts = 0;
  const maxConnectionAttempts = 3;
  
  // 尝试连接数据库
  while (connectionAttempts < maxConnectionAttempts) {
    const connected = await connectMongoDB();
    if (connected) {
      break;
    }
    connectionAttempts++;
    console.log(`Database connection attempt ${connectionAttempts} failed, retrying...`);
    await new Promise(resolve => setTimeout(resolve, 1000 * connectionAttempts));
  }
  
  if (connectionAttempts >= maxConnectionAttempts) {
    return NextResponse.json(
      { error: '无法连接到数据库，请稍后重试' },
      { status: 500 }
    );
  }
  
  try {
    // 使用重试机制处理并发查询
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      try {
        // 获取所有聊天记录，按更新时间倒序排列
        const chats = await Chat.find({})
          .sort({ updatedAt: -1 })
          .select('title createdAt updatedAt messages')
          .lean();
        
        // 转换为前端需要的格式
        const chatHistory = chats.map(chat => {
          // 获取第一条非用户消息作为预览
          const previewMessage = chat.messages.find(msg => !msg.isUser);
          const preview = previewMessage ? 
            previewMessage.content.length > 50 ? 
              previewMessage.content.substring(0, 50) + '...' : 
              previewMessage.content 
            : '暂无消息';
          
          return {
            id: chat._id.toString(),
            title: chat.title,
            date: chat.updatedAt.toISOString(), // 返回ISO格式的时间戳，让客户端处理格式化
            preview
          };
        });
        
        return NextResponse.json(chatHistory);
      } catch (queryError) {
        console.error(`Query attempt ${retryCount + 1} failed:`, queryError);
        retryCount++;
        
        // 如果还有重试机会，等待一段时间后重试
        if (retryCount < maxRetries) {
          const delayMs = 1000 * retryCount; // 递增延迟
          console.log(`Retrying after ${delayMs}ms...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
        } else {
          // 所有重试都失败了
          return NextResponse.json(
            { error: '获取聊天记录失败，请稍后重试', details: queryError instanceof Error ? queryError.message : 'Unknown error' },
            { status: 500 }
          );
        }
      }
    }
    
    // 理论上不会执行到这里
    return NextResponse.json(
      { error: '未知错误' },
      { status: 500 }
    );
  } catch (error) {
    console.error('Error fetching chat history:', error);
    return NextResponse.json(
      { error: '获取聊天记录失败', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// 创建新聊天记录
export async function POST(request: NextRequest) {
  let connectionAttempts = 0;
  const maxConnectionAttempts = 3;
  
  // 尝试连接数据库
  while (connectionAttempts < maxConnectionAttempts) {
    const connected = await connectMongoDB();
    if (connected) {
      break;
    }
    connectionAttempts++;
    console.log(`Database connection attempt ${connectionAttempts} failed, retrying...`);
    await new Promise(resolve => setTimeout(resolve, 1000 * connectionAttempts));
  }
  
  if (connectionAttempts >= maxConnectionAttempts) {
    return NextResponse.json(
      { error: '无法连接到数据库，请稍后重试' },
      { status: 500 }
    );
  }
  
  try {
    const { title, messages } = await request.json();
    
    if (!title) {
      return NextResponse.json(
        { error: '聊天标题不能为空' },
        { status: 400 }
      );
    }
    
    // 使用重试机制处理并发创建
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      try {
        // 创建新聊天记录
        const newChat = new Chat({
          title,
          messages: messages || []
        });
        
        await newChat.save();
        console.log(`New chat created with ID: ${newChat._id} on attempt ${retryCount + 1}`);
        
        return NextResponse.json({
          id: newChat._id.toString(),
          title: newChat.title,
          createdAt: newChat.createdAt.toISOString(),
          updatedAt: newChat.updatedAt.toISOString()
        });
      } catch (saveError) {
        console.error(`Save attempt ${retryCount + 1} failed:`, saveError);
        retryCount++;
        
        // 如果还有重试机会，等待一段时间后重试
        if (retryCount < maxRetries) {
          const delayMs = 1000 * retryCount; // 递增延迟
          console.log(`Retrying after ${delayMs}ms...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
        } else {
          // 所有重试都失败了
          return NextResponse.json(
            { error: '创建聊天记录失败，请稍后重试', details: saveError instanceof Error ? saveError.message : 'Unknown error' },
            { status: 500 }
          );
        }
      }
    }
    
    // 理论上不会执行到这里
    return NextResponse.json(
      { error: '未知错误' },
      { status: 500 }
    );
  } catch (error) {
    console.error('Error creating chat:', error);
    return NextResponse.json(
      { error: '创建聊天记录失败', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}