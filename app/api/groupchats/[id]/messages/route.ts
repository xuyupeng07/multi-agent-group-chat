import { NextRequest, NextResponse } from 'next/server';
import { connectMongoDB, GroupChat, Agent, GroupMessage } from '@/lib/mongodb';
import mongoose from 'mongoose';

// 获取群聊历史消息
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
      { success: false, error: '无法连接到数据库，请稍后重试' },
      { status: 500 }
    );
  }
  
  try {
    const { id } = await params;
    
    // 使用重试机制处理并发查询
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      try {
        // 获取群聊详情
        let groupChat = await GroupChat.findById(id);
        
        // 如果通过id找不到，尝试通过我们映射的id字段查找
        if (!groupChat) {
          groupChat = await GroupChat.findOne({ id: id });
        }
        
        if (!groupChat) {
          return NextResponse.json(
            { success: false, error: '群聊不存在' },
            { status: 404 }
          );
        }
        
        // 从群聊消息数据库中获取历史消息
        const messages = await GroupMessage.find({ groupId: groupChat._id })
          .sort({ timestamp: 1 }) // 按时间升序排列
          .lean(); // 使用lean()提高查询性能

        return NextResponse.json({
          success: true,
          messages: messages.map(msg => ({
            id: msg.messageId,
            agentName: msg.agentName,
            agentColor: msg.agentColor,
            content: msg.content,
            timestamp: msg.timestamp.toISOString(),
            isUser: msg.isUser,
            discussionMode: msg.discussionMode,
            roundNumber: msg.roundNumber
          }))
        });
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
            { success: false, error: '获取群聊消息失败，请稍后重试', details: queryError instanceof Error ? queryError.message : 'Unknown error' },
            { status: 500 }
          );
        }
      }
    }
    
    // 理论上不会执行到这里
    return NextResponse.json(
      { success: false, error: '未知错误' },
      { status: 500 }
    );
  } catch (error) {
    console.error('Error fetching group chat messages:', error);
    return NextResponse.json(
      { success: false, error: '获取群聊消息失败', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// 保存群聊消息
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
      { success: false, error: '无法连接到数据库，请稍后重试' },
      { status: 500 }
    );
  }

  try {
    const { id } = await params;
    const body = await request.json();

    // 验证请求数据
    const { messageId, agentName, agentColor, content, isUser, discussionMode = false, roundNumber = 0 } = body;

    if (!messageId || !agentName || !agentColor || content === undefined || isUser === undefined) {
      return NextResponse.json(
        { success: false, error: '缺少必要的消息字段' },
        { status: 400 }
      );
    }

    // 获取群聊详情
    let groupChat = await GroupChat.findById(id);

    // 如果通过id找不到，尝试通过我们映射的id字段查找
    if (!groupChat) {
      groupChat = await GroupChat.findOne({ id: id });
    }

    if (!groupChat) {
      return NextResponse.json(
        { success: false, error: '群聊不存在' },
        { status: 404 }
      );
    }

    // 使用重试机制处理并发写入
    let retryCount = 0;
    const maxRetries = 3;

    try {
      // 首先检查消息是否已存在
      const existingMessage = await GroupMessage.findOne({ messageId });
      if (existingMessage) {
        // 消息已存在，返回成功但不重复保存
        return NextResponse.json({
          success: true,
          message: {
            id: existingMessage.messageId,
            agentName: existingMessage.agentName,
            agentColor: existingMessage.agentColor,
            content: existingMessage.content,
            timestamp: existingMessage.timestamp.toISOString(),
            isUser: existingMessage.isUser,
            discussionMode: existingMessage.discussionMode,
            roundNumber: existingMessage.roundNumber
          },
          alreadyExists: true
        });
      }

      // 创建新的群聊消息
      const newMessage = new GroupMessage({
        groupId: groupChat._id,
        messageId,
        agentName,
        agentColor,
        content,
        timestamp: new Date(),
        isUser,
        discussionMode,
        roundNumber
      });

      await newMessage.save();

      return NextResponse.json({
        success: true,
        message: {
          id: newMessage.messageId,
          agentName: newMessage.agentName,
          agentColor: newMessage.agentColor,
          content: newMessage.content,
          timestamp: newMessage.timestamp.toISOString(),
          isUser: newMessage.isUser,
          discussionMode: newMessage.discussionMode,
          roundNumber: newMessage.roundNumber
        }
      });
    } catch (writeError) {
      console.error('Write failed:', writeError);

      // 检查是否是重复键错误
      if (writeError instanceof Error && writeError.message.includes('duplicate key')) {
        // 重复键错误，尝试查找现有消息
        try {
          const existingMessage = await GroupMessage.findOne({ messageId });
          if (existingMessage) {
            return NextResponse.json({
              success: true,
              message: {
                id: existingMessage.messageId,
                agentName: existingMessage.agentName,
                agentColor: existingMessage.agentColor,
                content: existingMessage.content,
                timestamp: existingMessage.timestamp.toISOString(),
                isUser: existingMessage.isUser,
                discussionMode: existingMessage.discussionMode,
                roundNumber: existingMessage.roundNumber
              },
              alreadyExists: true
            });
          }
        } catch (findError) {
          console.error('Failed to find existing message:', findError);
        }
      }

      // 其他错误
      return NextResponse.json(
        { success: false, error: '保存消息失败，请稍后重试', details: writeError instanceof Error ? writeError.message : 'Unknown error' },
        { status: 500 }
      );
    }

    // 理论上不会执行到这里
    return NextResponse.json(
      { success: false, error: '未知错误' },
      { status: 500 }
    );
  } catch (error) {
    console.error('Error saving group chat message:', error);
    return NextResponse.json(
      { success: false, error: '保存群聊消息失败', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}