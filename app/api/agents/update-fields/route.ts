import { connectMongoDB, Agent } from '@/lib/mongodb';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    // 连接数据库
    await connectMongoDB();
    
    // 更新所有智能体，添加缺失的字段
    const result = await Agent.updateMany(
      {}, // 匹配所有文档
      { 
        $set: {
          status: 'online',
          baseUrl: 'https://cloud.fastgpt.io/'
        }
      }
    );
    
    // 获取更新后的智能体列表
    const updatedAgents = await Agent.find({});
    
    return NextResponse.json({ 
      message: 'Agents updated successfully',
      modifiedCount: result.modifiedCount,
      agents: updatedAgents
    });
  } catch (error) {
    console.error('Error updating agents:', error);
    return NextResponse.json({ 
      error: 'Failed to update agents' 
    }, { status: 500 });
  }
}