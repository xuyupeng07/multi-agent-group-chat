import { connectMongoDB, Agent, GroupChat } from '@/lib/mongodb';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // 连接数据库
    await connectMongoDB();
    
    // 获取查询参数
    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('groupid');
    
    let agents;
    
    if (groupId && groupId !== "null") {
      // 如果提供了groupid且不是"null"字符串，获取该群聊的智能体
      let groupChat = await GroupChat.findById(groupId)
        .populate('agentIds', '_id name role introduction');
      
      // 如果通过_id找不到，尝试使用ObjectId构造函数查找
      if (!groupChat) {
        try {
          const ObjectId = require('mongoose').Types.ObjectId;
          groupChat = await GroupChat.findById(new ObjectId(groupId))
            .populate('agentIds', '_id name role introduction');
        } catch (error) {
          // 如果转换失败，继续尝试其他方法
        }
      }
      
      if (!groupChat) {
        return NextResponse.json({ 
          success: false,
          error: '群聊不存在' 
        }, { status: 404 });
      }
      
      // 提取群聊中的智能体
      agents = (groupChat.agentIds as any[]);
    } else {
      // 如果没有提供groupid或者groupid为"null"字符串，获取所有智能体
      agents = await Agent.find({}, '_id name role introduction');
    }
    
    // 格式化数据，将_id转换为id
    const formattedAgents = agents.map(agent => ({
      id: agent._id.toString(),
      name: agent.name,
      role: agent.role,
      introduction: agent.introduction || ""
    }));
    
    // 返回格式化的智能体数据
    return NextResponse.json({
      success: true,
      data: formattedAgents
    });
  } catch (error) {
    console.error('Error fetching agents info:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Failed to fetch agents info' 
    }, { status: 500 });
  }
}