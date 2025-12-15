import { connectMongoDB, Agent } from '@/lib/mongodb';
import { NextResponse } from 'next/server';

export async function PUT(request: Request) {
  try {
    const { id, name, role, introduction, apiKey, status, color, baseUrl } = await request.json();
    
    if (!id) {
      return NextResponse.json({ 
        error: 'Missing required field: id is required' 
      }, { status: 400 });
    }

    // 连接数据库
    await connectMongoDB();
    
    // 准备更新数据
    const updateData: {
      name?: string;
      role?: string;
      introduction?: string;
      apiKey?: string;
      status?: string;
      color?: string;
      baseUrl?: string;
    } = {};
    if (name !== undefined) updateData.name = name;
    if (role !== undefined) updateData.role = role;
    if (introduction !== undefined) updateData.introduction = introduction;
    if (apiKey !== undefined) updateData.apiKey = apiKey;
    if (status !== undefined) updateData.status = status;
    if (color !== undefined) updateData.color = color;
    if (baseUrl !== undefined) updateData.baseUrl = baseUrl;
    
    // 更新智能体配置 - 使用_id查找
    // 前端传递的id实际上是MongoDB的_id
    const updatedAgent = await Agent.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );
    
    if (!updatedAgent) {
      return NextResponse.json({ 
        error: 'Agent not found' 
      }, { status: 404 });
    }
    
    return NextResponse.json({ 
      message: 'Agent configuration updated successfully',
      agent: updatedAgent
    });
  } catch (error) {
    console.error('Error updating agent configuration:', error);
    return NextResponse.json({ 
      error: 'Failed to update agent configuration',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}