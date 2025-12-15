import { connectMongoDB, Agent } from '@/lib/mongodb';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // 连接数据库
    await connectMongoDB();
    
    // 获取所有智能体
    const agents = await Agent.find({}, 'name role apiKey color');
    
    // 返回智能体数据
    return NextResponse.json(agents);
  } catch (error) {
    console.error('Error fetching agents:', error);
    return NextResponse.json({ error: 'Failed to fetch agents' }, { status: 500 });
  }
}
