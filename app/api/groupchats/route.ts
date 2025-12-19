import { NextRequest, NextResponse } from 'next/server';
import { connectMongoDB, GroupChat, Agent } from '@/lib/mongodb';

// 获取所有群聊
export async function GET() {
  let connectionAttempts = 0;
  const maxConnectionAttempts = 3;
  
  // 尝试连接数据库
  while (connectionAttempts < maxConnectionAttempts) {
    const connected = await connectMongoDB();
    if (connected) {
      break;
    }
    connectionAttempts++;
    console.log(`Database connection attempt ${connectionAttempts} failed, retrying...`);
    await new Promise(resolve => setTimeout(resolve, 1000 * connectionAttempts));
  }
  
  if (connectionAttempts >= maxConnectionAttempts) {
    return NextResponse.json(
      { error: '无法连接到数据库，请稍后重试' },
      { status: 500 }
    );
  }
  
  try {
    // 使用重试机制处理并发查询
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      try {
        // 获取所有群聊并填充智能体信息
        const groupChats = await GroupChat.find({})
          .populate('agentIds', 'name role color avatar status')
          .sort({ updatedAt: -1 });
        
        // 将MongoDB的_id映射为前端期望的id
        const responseData = groupChats.map(chat => ({
          ...chat.toObject(),
          id: chat._id.toString()
        }));
        
        return NextResponse.json({ success: true, data: responseData });
      } catch (queryError) {
        console.error(`Query attempt ${retryCount + 1} failed:`, queryError);
        retryCount++;
        
        // 如果还有重试机会，等待一段时间后重试
        if (retryCount < maxRetries) {
          const delayMs = 1000 * retryCount; // 递增延迟
          console.log(`Retrying after ${delayMs}ms...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
        } else {
          // 所有重试都失败了
          return NextResponse.json(
            { success: false, error: '获取群聊列表失败，请稍后重试', details: queryError instanceof Error ? queryError.message : 'Unknown error' },
            { status: 500 }
          );
        }
      }
    }
    
    // 理论上不会执行到这里
    return NextResponse.json(
      { success: false, error: '未知错误' },
      { status: 500 }
    );
  } catch (error) {
    console.error('Error fetching group chats:', error);
    return NextResponse.json(
      { success: false, error: '获取群聊列表失败', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// 创建新群聊
export async function POST(request: NextRequest) {
  let connectionAttempts = 0;
  const maxConnectionAttempts = 3;
  
  // 尝试连接数据库
  while (connectionAttempts < maxConnectionAttempts) {
    const connected = await connectMongoDB();
    if (connected) {
      break;
    }
    connectionAttempts++;
    console.log(`Database connection attempt ${connectionAttempts} failed, retrying...`);
    await new Promise(resolve => setTimeout(resolve, 1000 * connectionAttempts));
  }
  
  if (connectionAttempts >= maxConnectionAttempts) {
    return NextResponse.json(
      { success: false, error: '无法连接到数据库，请稍后重试' },
      { status: 500 }
    );
  }
  
  try {
    // 获取请求数据
    const { name, description, agentIds, avatar } = await request.json();
    
    // 验证必填字段
    if (!name || !agentIds || agentIds.length === 0) {
      return NextResponse.json(
        { success: false, error: '群聊名称和智能体列表不能为空' },
        { status: 400 }
      );
    }
    
    // 使用重试机制处理并发创建
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      try {
        // 验证所有智能体ID是否存在
        // 处理两种可能的ID格式：MongoDB ObjectId 或 字符串ID
        const objectIds = agentIds.map((id: string) => {
          // 如果是MongoDB ObjectId字符串，直接使用
          if (typeof id === 'string' && id.length === 24 && /^[0-9a-fA-F]{24}$/.test(id)) {
            return id;
          }
          // 否则尝试转换为ObjectId
          try {
            return new (require('mongoose').Types.ObjectId)(id);
          } catch {
            return id;
          }
        });
        
        const agents = await Agent.find({ _id: { $in: objectIds } });
        if (agents.length !== agentIds.length) {
          return NextResponse.json(
            { success: false, error: '部分智能体不存在' },
            { status: 400 }
          );
        }
        
        // 创建新群聊
        const newGroupChat = new GroupChat({
          name,
          description: description || '',
          agentIds,
          avatar: avatar || ''
        });
        
        // 保存到数据库
        await newGroupChat.save();
        console.log(`New group chat created with ID: ${newGroupChat._id} on attempt ${retryCount + 1}`);
        
        // 返回包含智能体详细信息的群聊数据
        const populatedGroupChat = await GroupChat.findById(newGroupChat._id)
          .populate('agentIds', 'name role color avatar status');
        
        if (!populatedGroupChat) {
          return NextResponse.json(
            { success: false, error: '创建群聊后获取详细信息失败' },
            { status: 500 }
          );
        }
        
        // 将MongoDB的_id映射为前端期望的id
        const responseData = {
          ...populatedGroupChat.toObject(),
          id: populatedGroupChat._id.toString()
        };
        
        return NextResponse.json({ 
          success: true, 
          data: responseData,
          message: '群聊创建成功'
        });
      } catch (saveError) {
        console.error(`Save attempt ${retryCount + 1} failed:`, saveError);
        retryCount++;
        
        // 如果还有重试机会，等待一段时间后重试
        if (retryCount < maxRetries) {
          const delayMs = 1000 * retryCount; // 递增延迟
          console.log(`Retrying after ${delayMs}ms...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
        } else {
          // 所有重试都失败了
          let errorMessage = '创建群聊失败，请稍后重试';
          if (saveError instanceof Error) {
            if (saveError.message.includes('duplicate key')) {
              errorMessage = '已存在相同名称的群聊';
            } else {
              errorMessage = saveError.message;
            }
          }
          return NextResponse.json(
            { success: false, error: errorMessage, details: saveError instanceof Error ? saveError.message : 'Unknown error' },
            { status: 500 }
          );
        }
      }
    }
    
    // 理论上不会执行到这里
    return NextResponse.json(
      { success: false, error: '未知错误' },
      { status: 500 }
    );
  } catch (error) {
    console.error('Error creating group chat:', error);
    // 添加更详细的错误信息
    let errorMessage = '创建群聊失败';
    if (error instanceof Error) {
      if (error.message.includes('duplicate key')) {
        errorMessage = '已存在相同名称的群聊';
      } else {
        errorMessage = error.message;
      }
    }
    return NextResponse.json(
      { success: false, error: errorMessage, details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}