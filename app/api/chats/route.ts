import { NextRequest, NextResponse } from 'next/server';
import { connectMongoDB, Chat } from '@/lib/mongodb';

// 获取所有聊天记录列表
export async function GET() {
  try {
    await connectMongoDB();
    
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
      
      // 格式化日期
      const now = new Date();
      const chatDate = new Date(chat.updatedAt);
      const diffTime = Math.abs(now.getTime() - chatDate.getTime());
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      let dateText;
      if (diffDays === 0) {
        dateText = '今天';
      } else if (diffDays === 1) {
        dateText = '昨天';
      } else if (diffDays <= 7) {
        dateText = `${diffDays}天前`;
      } else {
        dateText = chatDate.toLocaleDateString('zh-CN');
      }
      
      return {
        id: chat._id.toString(),
        title: chat.title,
        date: dateText,
        preview
      };
    });
    
    return NextResponse.json(chatHistory);
  } catch (error) {
    console.error('Error fetching chat history:', error);
    return NextResponse.json(
      { error: '获取聊天记录失败' },
      { status: 500 }
    );
  }
}

// 创建新聊天记录
export async function POST(request: NextRequest) {
  try {
    await connectMongoDB();
    
    const { title, messages } = await request.json();
    
    if (!title) {
      return NextResponse.json(
        { error: '聊天标题不能为空' },
        { status: 400 }
      );
    }
    
    // 创建新聊天记录
    const newChat = new Chat({
      title,
      messages: messages || []
    });
    
    try {
      await newChat.save();
      console.log(`New chat created with ID: ${newChat._id}`);
    } catch (saveError) {
      console.error('Error creating new chat:', saveError);
      return NextResponse.json(
        { error: '创建聊天记录失败', details: saveError instanceof Error ? saveError.message : 'Unknown error' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      id: newChat._id.toString(),
      title: newChat.title,
      createdAt: newChat.createdAt,
      updatedAt: newChat.updatedAt
    });
  } catch (error) {
    console.error('Error creating chat:', error);
    return NextResponse.json(
      { error: '创建聊天记录失败' },
      { status: 500 }
    );
  }
}