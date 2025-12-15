import { connectMongoDB, Agent } from '@/lib/mongodb';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // 连接数据库
    await connectMongoDB();
    
    // 获取所有智能体
    const agents = await Agent.find({}, 'name role introduction apiKey color status baseUrl');
    
    // 返回智能体数据
    return NextResponse.json(agents);
  } catch (error) {
    console.error('Error fetching agents:', error);
    return NextResponse.json({ error: 'Failed to fetch agents' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    // 连接数据库
    await connectMongoDB();
    
    // 获取请求数据
    const { name, role, introduction, apiKey, status, color, baseUrl } = await request.json();
    
    // 验证必填字段
    if (!name || !role) {
      return NextResponse.json({ error: 'Name and role are required' }, { status: 400 });
    }
    
    // 创建新智能体，不需要自定义id字段，MongoDB会自动生成_id
    const newAgent = new Agent({
      name,
      role,
      introduction: introduction || '',
      apiKey: apiKey || '',
      status: status || 'offline',
      color: color || 'bg-blue-500',
      baseUrl: baseUrl || 'https://cloud.fastgpt.io/'
    });
    
    // 保存到数据库
    await newAgent.save();
    
    // 返回创建的智能体数据
    return NextResponse.json(newAgent, { status: 201 });
  } catch (error) {
    console.error('Error creating agent:', error);
    // 添加更详细的错误信息
    let errorMessage = 'Failed to create agent';
    if (error instanceof Error) {
      if (error.message.includes('duplicate key')) {
        errorMessage = 'Agent with this name already exists';
      } else {
        errorMessage = error.message;
      }
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
