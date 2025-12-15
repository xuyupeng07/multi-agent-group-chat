import { connectMongoDB, Agent } from '@/lib/mongodb';
import { NextResponse } from 'next/server';

export async function PUT(request: Request) {
  try {
    const { name, apiKey } = await request.json();
    
    if (!name || !apiKey) {
      return NextResponse.json({ 
        error: 'Missing required fields: name and apiKey are required' 
      }, { status: 400 });
    }

    // 连接数据库
    await connectMongoDB();
    
    // 更新智能体的API key
    const updatedAgent = await Agent.findOneAndUpdate(
      { name },
      { apiKey },
      { new: true }
    );
    
    if (!updatedAgent) {
      return NextResponse.json({ 
        error: 'Agent not found' 
      }, { status: 404 });
    }
    
    return NextResponse.json({ 
      message: 'API key updated successfully',
      agent: {
        name: updatedAgent.name,
        apiKey: updatedAgent.apiKey
      }
    });
  } catch (error) {
    console.error('Error updating API key:', error);
    return NextResponse.json({ 
      error: 'Failed to update API key' 
    }, { status: 500 });
  }
}