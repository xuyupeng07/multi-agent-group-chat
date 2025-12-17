import { connectMongoDB, Agent } from '@/lib/mongodb';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // 连接数据库
    await connectMongoDB();
    
    // 获取所有智能体，只返回id、name、role和introduction字段
    const agents = await Agent.find({}, '_id name role introduction');
    
    // 格式化数据，将_id转换为id
    const formattedAgents = agents.map(agent => ({
      id: agent._id.toString(),
      name: agent.name,
      role: agent.role,
      introduction: agent.introduction || ""
    }));
    
    // 返回格式化的智能体数据
    return NextResponse.json(formattedAgents);
  } catch (error) {
    console.error('Error fetching agents info:', error);
    return NextResponse.json({ error: 'Failed to fetch agents info' }, { status: 500 });
  }
}