import { connectMongoDB, Agent } from '@/lib/mongodb';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    // 连接数据库
    await connectMongoDB();
    
    // 检查是否已有智能体数据
    const existingAgents = await Agent.find({});
    
    // 如果已有数据，返回现有数据
    if (existingAgents.length > 0) {
      return NextResponse.json({ 
        message: 'Agents already exist',
        agents: existingAgents
      });
    }
    
    // 所有数据应从数据库获取，不创建硬编码的默认智能体
    return NextResponse.json({ 
      message: 'No agents found in database',
      agents: []
    });
  } catch (error) {
    console.error('Error initializing agents:', error);
    return NextResponse.json({ 
      error: 'Failed to initialize agents' 
    }, { status: 500 });
  }
}