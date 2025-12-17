import { connectMongoDB, Agent } from '@/lib/mongodb';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // 连接数据库
    await connectMongoDB();
    
    // 获取默认智能体 (ID: 6940567f484105cda2d631f5)
    const defaultAgent = await Agent.findById('6940567f484105cda2d631f5');
    
    if (!defaultAgent) {
      return NextResponse.json({ error: 'Default agent not found' }, { status: 404 });
    }
    
    // 返回默认智能体的基本信息
    return NextResponse.json({
      id: defaultAgent._id.toString(),
      name: defaultAgent.name,
      role: defaultAgent.role,
      color: defaultAgent.color
    });
  } catch (error) {
    console.error('Error fetching default agent:', error);
    return NextResponse.json({ error: 'Failed to fetch default agent' }, { status: 500 });
  }
}