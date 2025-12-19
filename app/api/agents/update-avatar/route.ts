import { connectMongoDB, Agent } from '@/lib/mongodb';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    // 连接数据库
    await connectMongoDB();
    
    // 获取请求数据
    const { agentId, avatar } = await request.json();
    
    // 调试代码
    console.log('Update avatar request:', {
      agentId,
      avatarLength: avatar?.length,
      avatarStart: avatar?.substring(0, 20) + (avatar?.length > 20 ? "..." : "")
    });
    
    // 验证必填字段
    if (!agentId || !avatar) {
      return NextResponse.json({ error: '智能体ID和头像数据是必填项' }, { status: 400 });
    }
    
    // 更新智能体头像
    const updatedAgent = await Agent.findByIdAndUpdate(
      agentId,
      { avatar: avatar },
      { new: true } // 返回更新后的文档
    );
    
    if (!updatedAgent) {
      return NextResponse.json({ error: '未找到指定的智能体' }, { status: 404 });
    }
    
    return NextResponse.json({ 
      message: '头像更新成功',
      agent: updatedAgent
    });
  } catch (error) {
    console.error('Error updating avatar:', error);
    return NextResponse.json({ 
      error: '更新头像失败',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}