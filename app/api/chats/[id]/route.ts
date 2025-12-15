import { NextRequest, NextResponse } from 'next/server';
import { connectMongoDB, Chat } from '@/lib/mongodb';
import mongoose from 'mongoose';

// 获取单个聊天记录的详细信息
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectMongoDB();
    
    const { id: chatId } = await params;
    
    if (!chatId) {
      return NextResponse.json(
        { error: '聊天ID不能为空' },
        { status: 400 }
      );
    }
    
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
  } catch (error) {
    console.error('Error fetching chat details:', error);
    return NextResponse.json(
      { error: '获取聊天详情失败' },
      { status: 500 }
    );
  }
}

// 更新聊天记录（添加新消息）
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectMongoDB();
    
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
    
    // 查找并更新聊天记录
    const chat = await Chat.findById(chatId);
    
    if (!chat) {
      console.error(`Chat not found with ID: ${chatId}`);
      return NextResponse.json(
        { error: '聊天记录不存在' },
        { status: 404 }
      );
    }
    
    console.log(`Updating chat ${chatId} with ${messages.length} messages`);
    
    // 更新消息和更新时间
    chat.set('messages', messages.map(msg => ({
      id: msg.id,
      agentName: msg.agentName,
      agentColor: msg.agentColor,
      content: msg.content,
      timestamp: new Date(msg.timestamp), // 确保timestamp是Date对象
      isUser: msg.isUser
    })));
    chat.updatedAt = new Date();
    
    try {
      await chat.save();
      console.log(`Chat ${chatId} saved successfully`);
    } catch (saveError) {
      // 如果是版本错误，尝试重新获取并更新
      if (saveError instanceof Error && saveError.name === 'VersionError') {
        console.log('Version conflict detected, retrying with fresh document...');
        try {
          // 重新获取最新的文档
          const freshChat = await Chat.findById(chatId);
          if (!freshChat) {
            return NextResponse.json(
              { error: '聊天记录不存在' },
              { status: 404 }
            );
          }
          
          // 更新消息和更新时间
          freshChat.set('messages', messages.map(msg => ({
            id: msg.id,
            agentName: msg.agentName,
            agentColor: msg.agentColor,
            content: msg.content,
            timestamp: new Date(msg.timestamp),
            isUser: msg.isUser
          })));
          freshChat.updatedAt = new Date();
          
          await freshChat.save();
          console.log(`Chat ${chatId} saved successfully on retry`);
          
          // 使用更新后的文档创建响应
          const responseChat = freshChat;
          try {
            return NextResponse.json({
              id: responseChat._id.toString(),
              title: responseChat.title,
              createdAt: responseChat.createdAt.toISOString(),
              updatedAt: responseChat.updatedAt.toISOString(),
              messageCount: responseChat.messages.length
            });
          } catch (responseError) {
            console.error('Error creating response:', responseError);
            return NextResponse.json({
              id: responseChat._id.toString(),
              title: responseChat.title,
              success: true
            });
          }
        } catch (retryError) {
          console.error('Error on retry save:', retryError);
          return NextResponse.json(
            { error: '保存聊天记录失败，请重试', details: retryError instanceof Error ? retryError.message : 'Unknown error' },
            { status: 500 }
          );
        }
      } else {
        console.error('Error saving chat:', saveError);
        return NextResponse.json(
          { error: '保存聊天记录失败', details: saveError instanceof Error ? saveError.message : 'Unknown error' },
          { status: 500 }
        );
      }
    }
    
    try {
      return NextResponse.json({
        id: chat._id.toString(),
        title: chat.title,
        createdAt: chat.createdAt.toISOString(),
        updatedAt: chat.updatedAt.toISOString(),
        messageCount: chat.messages.length
      });
    } catch (responseError) {
      console.error('Error creating response:', responseError);
      // 如果创建响应失败，至少返回一个简单的成功响应
      return NextResponse.json({
        id: chat._id.toString(),
        title: chat.title,
        success: true
      });
    }
  } catch (error) {
    console.error('Error updating chat:', error);
    return NextResponse.json(
      { error: '更新聊天记录失败' },
      { status: 500 }
    );
  }
}

// 删除聊天记录
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectMongoDB();
    
    const { id: chatId } = await params;
    
    if (!chatId) {
      return NextResponse.json(
        { error: '聊天ID不能为空' },
        { status: 400 }
      );
    }
    
    // 删除聊天记录
    const result = await Chat.findByIdAndDelete(chatId);
    
    if (!result) {
      return NextResponse.json(
        { error: '聊天记录不存在' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting chat:', error);
    return NextResponse.json(
      { error: '删除聊天记录失败' },
      { status: 500 }
    );
  }
}