import { NextRequest, NextResponse } from 'next/server';
import { connectMongoDB, GroupChat, Agent } from '@/lib/mongodb';

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
        
        // 这里应该从消息数据库中获取历史消息
        // 目前返回空数组，因为消息存储功能尚未实现
        // 在实际应用中，您可能需要创建一个消息模型来存储群聊消息
        return NextResponse.json({
          success: true,
          messages: []
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