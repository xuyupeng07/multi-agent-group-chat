import { NextRequest, NextResponse } from 'next/server';
import { connectMongoDB, GroupChat, Agent } from '@/lib/mongodb';

// 获取单个群聊详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const { id } = await params;
    
    // 使用重试机制处理并发查询
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      try {
        // 获取群聊详情并填充智能体信息 - 尝试两种ID格式
        let groupChat = await GroupChat.findById(id)
          .populate('agentIds', 'name role color avatar status introduction apiKey baseUrl');
        
        // 如果通过id找不到，尝试通过我们映射的id字段查找
        if (!groupChat) {
          groupChat = await GroupChat.findOne({ id: id })
            .populate('agentIds', 'name role color avatar status introduction apiKey baseUrl');
        }
        
        if (!groupChat) {
          return NextResponse.json(
            { success: false, error: '群聊不存在' },
            { status: 404 }
          );
        }
        
        // 将MongoDB的_id映射为前端期望的id
        const responseData = {
          ...groupChat.toObject(),
          id: groupChat._id.toString()
        };
        
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
            { success: false, error: '获取群聊详情失败，请稍后重试', details: queryError instanceof Error ? queryError.message : 'Unknown error' },
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
    console.error('Error fetching group chat:', error);
    return NextResponse.json(
      { success: false, error: '获取群聊详情失败', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// 更新群聊信息
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const { id } = await params;
    const { name, description, agentIds, avatar } = await request.json();
    
    // 使用重试机制处理并发更新
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      try {
        // 检查群聊是否存在 - 尝试两种ID格式
        let existingGroupChat = await GroupChat.findById(id);
        
        // 如果通过id找不到，尝试通过我们映射的id字段查找
        if (!existingGroupChat) {
          existingGroupChat = await GroupChat.findOne({ id: id });
        }
        
        if (!existingGroupChat) {
          return NextResponse.json(
            { success: false, error: '群聊不存在' },
            { status: 404 }
          );
        }
        
        // 更新群聊信息
        const updateData: any = {
          updatedAt: new Date()
        };
        
        // 如果更新了智能体列表，验证所有智能体ID是否存在
        if (agentIds && agentIds.length > 0) {
          // 首先尝试通过_id查找
          let agents = await Agent.find({ _id: { $in: agentIds } });

          // 如果通过_id找到的数量不足，说明可能使用的是映射的id字段
          if (agents.length < agentIds.length) {
            // 找出还没有找到的ID
            const foundIds = new Set(agents.map(a => a._id.toString()));
            const missingIds = agentIds.filter((id: string) => !foundIds.has(id));

            if (missingIds.length > 0) {
              // 通过映射的id字段查找
              const agentsByMappedId = await Agent.find({ id: { $in: missingIds } });

              // 只添加通过映射id找到的智能体
              agents = [...agents, ...agentsByMappedId];
            }
          }

          // 去重（基于_id）
          const uniqueAgents = agents.filter((agent, index, self) =>
            index === self.findIndex((a) => a._id.toString() === agent._id.toString())
          );

          console.log(`Found ${uniqueAgents.length} agents out of ${agentIds.length} requested`);
          console.log('Requested agent IDs:', agentIds);
          console.log('Found agent IDs:', uniqueAgents.map(a => a._id.toString()));

          // 如果找到的智能体数量少于请求的数量，说明有智能体不存在
          if (uniqueAgents.length < agentIds.length) {
            // 找出哪些ID不存在
            const foundIds = new Set([
              ...uniqueAgents.map(a => a._id.toString()),
              ...uniqueAgents.map(a => a.id).filter(Boolean)
            ]);
            const missingIds = agentIds.filter((id: string) => !foundIds.has(id));

            console.error('Missing agent IDs:', missingIds);

            return NextResponse.json(
              {
                success: false,
                error: `部分智能体不存在: ${missingIds.join(', ')}`,
                missingIds: missingIds
              },
              { status: 400 }
            );
          }

          // 将找到的智能体ID转换为ObjectId格式用于更新
          const validAgentIds = uniqueAgents.map(agent => agent._id.toString());
          updateData.agentIds = validAgentIds;
        }
        
        if (name) updateData.name = name;
        if (description !== undefined) updateData.description = description;
        if (avatar !== undefined) updateData.avatar = avatar;
        
        // agentIds的赋值已在上面的验证逻辑中处理
        
        // 使用实际的_id进行更新
        const updatedGroupChat = await GroupChat.findByIdAndUpdate(
          existingGroupChat._id,
          updateData,
          { new: true }
        ).populate('agentIds', 'name role color avatar status');
        
        if (!updatedGroupChat) {
          return NextResponse.json(
            { success: false, error: '更新群聊失败' },
            { status: 500 }
          );
        }
        
        console.log(`Group chat updated with ID: ${id} on attempt ${retryCount + 1}`);
        
        // 将MongoDB的_id映射为前端期望的id
        const responseData = {
          ...updatedGroupChat.toObject(),
          id: updatedGroupChat._id.toString()
        };
        
        return NextResponse.json({ 
          success: true, 
          data: responseData,
          message: '群聊更新成功'
        });
      } catch (saveError) {
        console.error(`Update attempt ${retryCount + 1} failed:`, saveError);
        retryCount++;
        
        // 如果还有重试机会，等待一段时间后重试
        if (retryCount < maxRetries) {
          const delayMs = 1000 * retryCount; // 递增延迟
          console.log(`Retrying after ${delayMs}ms...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
        } else {
          // 所有重试都失败了
          let errorMessage = '更新群聊失败，请稍后重试';
          if (saveError instanceof Error) {
            errorMessage = saveError.message;
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
    console.error('Error updating group chat:', error);
    return NextResponse.json(
      { success: false, error: '更新群聊失败', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// 删除群聊
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const { id } = await params;
    
    // 使用重试机制处理并发删除
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      try {
        // 检查群聊是否存在 - 尝试两种ID格式
        let existingGroupChat = await GroupChat.findById(id);
        
        // 如果通过id找不到，尝试通过我们映射的id字段查找
        if (!existingGroupChat) {
          existingGroupChat = await GroupChat.findOne({ id: id });
        }
        
        if (!existingGroupChat) {
          return NextResponse.json(
            { success: false, error: '群聊不存在' },
            { status: 404 }
          );
        }
        
        // 删除群聊 - 使用实际的_id进行删除
        await GroupChat.findByIdAndDelete(existingGroupChat._id);
        
        console.log(`Group chat deleted with ID: ${id} on attempt ${retryCount + 1}`);
        
        return NextResponse.json({ 
          success: true, 
          message: '群聊删除成功'
        });
      } catch (deleteError) {
        console.error(`Delete attempt ${retryCount + 1} failed:`, deleteError);
        retryCount++;
        
        // 如果还有重试机会，等待一段时间后重试
        if (retryCount < maxRetries) {
          const delayMs = 1000 * retryCount; // 递增延迟
          console.log(`Retrying after ${delayMs}ms...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
        } else {
          // 所有重试都失败了
          let errorMessage = '删除群聊失败，请稍后重试';
          if (deleteError instanceof Error) {
            errorMessage = deleteError.message;
          }
          return NextResponse.json(
            { success: false, error: errorMessage, details: deleteError instanceof Error ? deleteError.message : 'Unknown error' },
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
    console.error('Error deleting group chat:', error);
    return NextResponse.json(
      { success: false, error: '删除群聊失败', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}