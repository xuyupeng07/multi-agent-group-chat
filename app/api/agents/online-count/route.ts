import { connectMongoDB, Agent } from '@/lib/mongodb';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // 连接数据库
    await connectMongoDB();
    
    // 获取所有在线的智能体
    const onlineAgents = await Agent.find({ status: 'online' });
    
    // 返回在线智能体数量
    return NextResponse.json({ count: onlineAgents.length });
  } catch (error) {
    console.error('Error fetching online agents count:', error);
    return NextResponse.json({ error: 'Failed to fetch online agents count' }, { status: 500 });
  }
}