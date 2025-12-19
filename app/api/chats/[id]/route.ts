import { NextRequest, NextResponse } from 'next/server';
import { connectMongoDB, Chat } from '@/lib/mongodb';

// 获取单个聊天记录的详细信息
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
      { error: '无法连接到数据库，请稍后重试' },
      { status: 500 }
    );
  }
  
  try {
    const { id: chatId } = await params;
    
    if (!chatId) {
      return NextResponse.json(
        { error: '聊天ID不能为空' },
        { status: 400 }
      );
    }
    
    // 使用重试机制处理并发查询
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      try {
        // 查找聊天记录
        const chat = await Chat.findById(chatId);
        
        if (!chat) {
          return NextResponse.json(
            { error: '聊天记录不存在' },
            { status: 404 }
          );
        }
        
        // 转换消息格式以匹配前端需要的格式
        const messages = chat.messages.map(msg => ({
          id: msg.id,
          agentName: msg.agentName,
          agentColor: msg.agentColor,
          content: msg.content,
          timestamp: msg.timestamp.toISOString(),
          isUser: msg.isUser
        }));
        
        return NextResponse.json({
          id: chat._id.toString(),
          title: chat.title,
          createdAt: chat.createdAt.toISOString(),
          updatedAt: chat.updatedAt.toISOString(),
          messages
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
    console.error('Error fetching chat details:', error);
    return NextResponse.json(
      { error: '获取聊天记录失败', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// 更新聊天记录（添加新消息）
export async function PUT(
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
      { error: '无法连接到数据库，请稍后重试' },
      { status: 500 }
    );
  }
  
  try {
    const { id: chatId } = await params;
    const { messages } = await request.json();
    
    if (!chatId) {
      return NextResponse.json(
        { error: '聊天ID不能为空' },
        { status: 400 }
      );
    }
    
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: '消息格式不正确' },
        { status: 400 }
      );
    }
    
    // 使用重试机制处理并发更新
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      try {
        // 查找并更新聊天记录
        const chat = await Chat.findById(chatId);
        
        if (!chat) {
          console.error(`Chat not found with ID: ${chatId}`);
          return NextResponse.json(
            { error: '聊天记录不存在' },
            { status: 404 }
          );
        }
        
        console.log(`Updating chat ${chatId} with ${messages.length} messages (attempt ${retryCount + 1})`);
        
        // 使用原子更新操作来避免版本冲突
        // 将消息转换为适合MongoDB存储的格式
        const formattedMessages = messages.map(msg => ({
          id: msg.id,
          agentName: msg.agentName,
          agentColor: msg.agentColor,
          content: msg.content,
          timestamp: new Date(msg.timestamp),
          isUser: msg.isUser
        }));
        
        // 使用 findOneAndUpdate 进行原子更新，避免版本冲突
        const updatedChat = await Chat.findOneAndUpdate(
          { _id: chatId },
          { 
            $set: {
              messages: formattedMessages,
              updatedAt: new Date()
            }
          },
          { 
            new: true, // 返回更新后的文档
            runValidators: true // 运行验证器
          }
        );
        
        if (!updatedChat) {
          console.error(`Failed to update chat ${chatId}: Document not found after update`);
          throw new Error('文档更新失败，请重试');
        }
        
        console.log(`Chat ${chatId} saved successfully on attempt ${retryCount + 1}`);
        
        // 返回成功响应
        try {
          return NextResponse.json({
            id: updatedChat._id.toString(),
            title: updatedChat.title,
            createdAt: updatedChat.createdAt.toISOString(),
            updatedAt: updatedChat.updatedAt.toISOString(),
            messageCount: updatedChat.messages.length
          });
        } catch (responseError) {
          console.error('Error creating response:', responseError);
          return NextResponse.json({
            id: updatedChat._id.toString(),
            title: updatedChat.title,
            success: true
          });
        }
      } catch (saveError: unknown) {
        console.error(`Save attempt ${retryCount + 1} failed:`, saveError);
        
        // 检查是否是版本冲突错误
        if (
          saveError instanceof Error && 
          saveError.name === 'VersionError' && 
          retryCount < maxRetries - 1
        ) {
          retryCount++;
          const delayMs = 1000 * retryCount; // 递增延迟
          console.log(`Version conflict detected, retrying after ${delayMs}ms...`);
          // 尝试获取版本信息
          const versionInfo = (saveError as Error & { version?: number }).version;
          const modifiedPaths = (saveError as Error & { modifiedPaths?: string[] }).modifiedPaths;
          console.log(`Version: ${versionInfo}, Modified paths: ${modifiedPaths}`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
          continue; // 继续下一次重试
        }
        
        // 非版本冲突错误或已达到最大重试次数
        retryCount++;
        
        // 如果还有重试机会，等待一段时间后重试
        if (retryCount < maxRetries) {
          const delayMs = 1000 * retryCount; // 递增延迟
          console.log(`Retrying after ${delayMs}ms...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
        } else {
          // 所有重试都失败了
          return NextResponse.json(
            { error: '保存聊天记录失败，请稍后重试', details: saveError instanceof Error ? saveError.message : 'Unknown error' },
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
    console.error('Error updating chat:', error);
    return NextResponse.json(
      { error: '更新聊天记录失败', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// 删除聊天记录
export async function DELETE(
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
      { error: '无法连接到数据库，请稍后重试' },
      { status: 500 }
    );
  }
  
  try {
    const { id: chatId } = await params;
    
    if (!chatId) {
      return NextResponse.json(
        { error: '聊天ID不能为空' },
        { status: 400 }
      );
    }
    
    // 使用重试机制处理并发删除
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      try {
        // 删除聊天记录
        const result = await Chat.findByIdAndDelete(chatId);
        
        if (!result) {
          return NextResponse.json(
            { error: '聊天记录不存在' },
            { status: 404 }
          );
        }
        
        console.log(`Chat ${chatId} deleted successfully on attempt ${retryCount + 1}`);
        return NextResponse.json({ success: true });
      } catch (deleteError) {
        console.error(`Delete attempt ${retryCount + 1} failed:`, deleteError);
        retryCount++;
        
        // 如果还有重试机会，等待一段时间后重试
        if (retryCount < maxRetries) {
          const delayMs = 1000 * retryCount; // 递增延迟
          console.log(`Retrying after ${delayMs}ms...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
        } else {
          // 所有重试都失败了
          return NextResponse.json(
            { error: '删除聊天记录失败，请稍后重试', details: deleteError instanceof Error ? deleteError.message : 'Unknown error' },
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
    console.error('Error deleting chat:', error);
    return NextResponse.json(
      { error: '删除聊天记录失败', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}