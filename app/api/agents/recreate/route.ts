import { connectMongoDB, Agent } from '@/lib/mongodb';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    // 连接数据库
    await connectMongoDB();
    
    // 删除所有现有智能体
    await Agent.deleteMany({});
    
    // 所有智能体数据应从数据库获取，不创建硬编码的默认智能体
    // 如果需要默认智能体，请通过数据库管理界面添加
    
    return NextResponse.json({ 
      message: 'All agents deleted successfully. Please add agents through the database management interface.',
      agents: []
    });
  } catch (error) {
    console.error('Error recreating agents:', error);
    return NextResponse.json({ 
      error: 'Failed to recreate agents' 
    }, { status: 500 });
  }
}