import { connectMongoDB, GroupChat } from '@/lib/mongodb';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    // 连接数据库
    await connectMongoDB();
    
    // 获取请求数据
    const { groupId, avatar } = await request.json();
    
    // 调试代码
    console.log('Update group avatar request:', {
      groupId,
      avatarLength: avatar?.length,
      avatarStart: avatar?.substring(0, 20) + (avatar?.length > 20 ? "..." : "")
    });
    
    // 验证必填字段
    if (!groupId || !avatar) {
      return NextResponse.json({ error: '群聊ID和头像数据是必填项' }, { status: 400 });
    }
    
    // 更新群聊头像
    const updatedGroupChat = await GroupChat.findByIdAndUpdate(
      groupId,
      { avatar: avatar },
      { new: true } // 返回更新后的文档
    );
    
    if (!updatedGroupChat) {
      return NextResponse.json({ error: '未找到指定的群聊' }, { status: 404 });
    }
    
    return NextResponse.json({ 
      message: '群聊头像更新成功',
      groupChat: updatedGroupChat
    });
  } catch (error) {
    console.error('Error updating group avatar:', error);
    return NextResponse.json({ 
      error: '更新群聊头像失败',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}