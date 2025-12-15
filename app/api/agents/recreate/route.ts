import { connectMongoDB, Agent } from '@/lib/mongodb';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    // 连接数据库
    await connectMongoDB();
    
    // 删除所有现有智能体
    await Agent.deleteMany({});
    
    // 创建新的智能体，包含所有字段
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
        apiKey: "fastgpt-nDy8NJLRSiex8ATMGDtxmCoDjGC7MhrE8OyyNEHZjWc6cNOYeYcPmYBB",
        baseUrl: "https://cloud.fastgpt.io/"
      },
      {
        name: "酒店管家",
        role: "Hotel Butler",
        status: "online",
        color: "bg-green-500",
        apiKey: "fastgpt-aiPG4I8iOc9JwWu0QuK4YmyZspaOHz838VI8FiSWhWFcRhIj2GUj8jL",
        baseUrl: "https://cloud.fastgpt.io/"
      },
      {
        name: "美食顾问",
        role: "Food Advisor",
        status: "online",
        color: "bg-purple-500",
        apiKey: "fastgpt-d4GnvzjySByhYJoqS4SFuKbhf4f0PWrtfH5bQKn9L6GvWv29Arlf8Vku1Tux2QR3f",
        baseUrl: "https://cloud.fastgpt.io/"
      }
    ];
    
    // 插入新的智能体
    const createdAgents = await Agent.insertMany(defaultAgents);
    
    return NextResponse.json({ 
      message: 'Agents recreated successfully',
      agents: createdAgents
    });
  } catch (error) {
    console.error('Error recreating agents:', error);
    return NextResponse.json({ 
      error: 'Failed to recreate agents' 
    }, { status: 500 });
  }
}