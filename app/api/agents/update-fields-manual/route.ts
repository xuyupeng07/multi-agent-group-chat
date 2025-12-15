import { connectMongoDB, Agent } from '@/lib/mongodb';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    // 连接数据库
    await connectMongoDB();
    
    // 获取所有智能体
    const agents = await Agent.find({});
    
    // 逐个更新每个智能体
    for (const agent of agents) {
      agent.status = 'online';
      agent.baseUrl = 'https://cloud.fastgpt.io/';
      await agent.save();
    }
    
    // 获取更新后的智能体列表
    const updatedAgents = await Agent.find({});
    
    return NextResponse.json({ 
      message: 'Agents updated successfully',
      count: agents.length,
      agents: updatedAgents
    });
  } catch (error) {
    console.error('Error updating agents:', error);
    return NextResponse.json({ 
      error: 'Failed to update agents' 
    }, { status: 500 });
  }
}