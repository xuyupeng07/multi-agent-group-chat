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
    
    // 创建默认智能体
    const defaultAgents = [
      {
        name: "旅行管家",
        role: "Travel Butler",
        status: "online",
        color: "bg-orange-500",
        apiKey: "fastgpt-lAf0Gg6mtMaApu0gsA0vzK6nWEa8eD5gPMLVD1CdeD0ysIEtWLjBsPt",
        baseUrl: "https://cloud.fastgpt.io/"
      },
      {
        name: "交通助手",
        role: "Traffic Assistant",
        status: "online",
        color: "bg-blue-500",
        apiKey: "",
        baseUrl: "https://cloud.fastgpt.io/"
      },
      {
        name: "酒店管家",
        role: "Hotel Butler",
        status: "online",
        color: "bg-green-500",
        apiKey: "",
        baseUrl: "https://cloud.fastgpt.io/"
      },
      {
        name: "美食顾问",
        role: "Food Advisor",
        status: "online",
        color: "bg-purple-500",
        apiKey: "",
        baseUrl: "https://cloud.fastgpt.io/"
      }
    ];
    
    // 插入默认智能体
    const createdAgents = await Agent.insertMany(defaultAgents);
    
    return NextResponse.json({ 
      message: 'Default agents created successfully',
      agents: createdAgents
    });
  } catch (error) {
    console.error('Error initializing agents:', error);
    return NextResponse.json({ 
      error: 'Failed to initialize agents' 
    }, { status: 500 });
  }
}