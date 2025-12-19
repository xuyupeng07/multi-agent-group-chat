import { NextRequest, NextResponse } from 'next/server';
import { connectMongoDB, GroupChat, Agent } from '@/lib/mongodb';
import { callDiscussionDispatchCenter, getAgentApiKey, FastGPTMessage } from '@/lib/fastgpt';

// 发送群聊消息
export async function POST(
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
    const { message, agentIds, discuss = false } = await request.json();
    
    if (!message || !message.trim()) {
      return NextResponse.json(
        { success: false, error: '消息内容不能为空' },
        { status: 400 }
      );
    }
    
    // 使用重试机制处理并发查询
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      try {
        // 获取群聊详情并填充智能体信息
        let groupChat = await GroupChat.findById(id)
          .populate('agentIds', 'name role color avatar status introduction apiKey baseUrl');
        
        // 如果通过_id找不到，说明前端发送的id可能是映射后的id，尝试查找
        if (!groupChat) {
          // 尝试使用ObjectId构造函数查找
          try {
            const ObjectId = require('mongoose').Types.ObjectId;
            groupChat = await GroupChat.findById(new ObjectId(id))
              .populate('agentIds', 'name role color avatar status introduction apiKey baseUrl');
          } catch (error) {
            // 如果转换失败，继续尝试其他方法
          }
        }
        
        if (!groupChat) {
          return NextResponse.json(
            { success: false, error: '群聊不存在' },
            { status: 404 }
          );
        }
        
        // 获取群聊中的智能体
        const groupAgents = groupChat.agentIds as any[];
        
        if (groupAgents.length === 0) {
          return NextResponse.json(
            { success: false, error: '群聊中没有智能体' },
            { status: 400 }
          );
        }
        
        // 准备调用调度中心的消息格式
        const messages: FastGPTMessage[] = [
          {
            role: 'user' as const,
            content: message
          }
        ];
        
        // 调用讨论调度中心
        const dispatchResponse = await callDiscussionDispatchCenter(
          groupChat._id.toString(),
          messages,
          groupChat._id.toString(),
          discuss // 根据参数决定是否开启讨论模式
        );
        
        console.log('Dispatch response received:', JSON.stringify(dispatchResponse, null, 2));
        
        if (dispatchResponse && dispatchResponse.choices && dispatchResponse.choices.length > 0) {
          // 格式化返回的消息
          const content = dispatchResponse.choices[0].message.content;
          console.log('Dispatch content:', content);
          
          // 尝试解析内容中的多个智能体回复
            let agentResponses: Array<{agentName: string, content: string}> = [];
            
            try {
              // 首先尝试解析为JSON格式的智能体列表
              let agentList = [];
              
              try {
                agentList = JSON.parse(content);
                console.log('Parsed agent list from dispatch center:', agentList);
              } catch (parseError) {
                console.error('Failed to parse agent list from dispatch center:', parseError);
                console.error('Raw content that failed to parse:', content);
                // 如果解析失败，尝试其他格式
              }
              
              // 如果成功解析出智能体列表，根据discuss参数决定处理方式
              if (Array.isArray(agentList) && agentList.length > 0) {
                console.log('Processing agent list with', agentList.length, 'agents');
                
                // 如果是讨论模式，只返回第一个智能体，让前端进行持续轮询
                if (discuss) {
                  const selectedAgent = agentList.length > 0 ? agentList[0] : {
                    id: 'fastgpt-lAf0Gg6mtMaApu0gsA0vzK6nWEa8eD5gPMLVD1CdeD0ysIEtWLjBsPt',
                    name: '默认智能体'
                  };
                  console.log('Discussion mode: returning selected agent', selectedAgent);
                  
                  // 返回选中的智能体信息，让前端调用
                  return NextResponse.json({
                    success: true,
                    discussionMode: true,
                    selectedAgent: selectedAgent,
                    messages: [] // 不直接返回消息，由前端处理
                  });
                }
                
                // 非讨论模式，为每个智能体调用聊天API
                const agentPromises = agentList.map(async (agentInfo: { id: string; name: string }) => {
                  try {
                    console.log('Processing agent:', agentInfo);
                    // 获取智能体API密钥
                    const agentApiKey = await getAgentApiKey(agentInfo.id, agentInfo.name);
                    
                    if (!agentApiKey) {
                      console.error(`No API key found for agent: ${agentInfo.name}`);
                      return {
                        agentName: agentInfo.name,
                        content: `${agentInfo.name}暂无回复 - API密钥未找到`
                      };
                    }
                    
                    // 调用智能体聊天API - 直接调用FastGPT API
                    const FASTGPT_API_URL = 'https://cloud.fastgpt.io/api/v1/chat/completions';
                    const response = await fetch(FASTGPT_API_URL, {
                      method: 'POST',
                      headers: {
                        'Authorization': `Bearer ${agentApiKey}`,
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        chatId: `groupchat_${groupChat._id.toString()}`,
                        stream: false,
                        messages,
                      }),
                    });
                    
                    if (!response.ok) {
                      throw new Error(`Agent API error: ${response.status} ${response.statusText}`);
                    }
                    
                    const data = await response.json();
                    const agentResponse = data.choices?.[0]?.message?.content || `${agentInfo.name}暂无回复`;
                    
                    // 返回智能体回复
                    return {
                      agentName: agentInfo.name,
                      content: agentResponse
                    };
                  } catch (error) {
                    console.error(`Error getting response from agent ${agentInfo.name}:`, error);
                    return {
                      agentName: agentInfo.name,
                      content: `${agentInfo.name}回复出错: ${error instanceof Error ? error.message : '未知错误'}`
                    };
                  }
                });
                
                // 等待所有智能体回复
                const agentResults = await Promise.all(agentPromises);
                
                // 过滤掉null结果
                agentResponses = agentResults.filter(result => result !== null) as Array<{agentName: string, content: string}>;
              } else {
                // 如果调度中心返回空列表，使用默认智能体
                console.log('Dispatch center returned empty list, using default agent');
                const defaultAgentId = 'fastgpt-lAf0Gg6mtMaApu0gsA0vzK6nWEa8eD5gPMLVD1CdeD0ysIEtWLjBsPt';
                const defaultAgentName = '默认智能体';
                
                try {
                  // 调用默认智能体API
                  const FASTGPT_API_URL = 'https://cloud.fastgpt.io/api/v1/chat/completions';
                  const response = await fetch(FASTGPT_API_URL, {
                    method: 'POST',
                    headers: {
                      'Authorization': `Bearer ${defaultAgentId}`,
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      chatId: `groupchat_${groupChat._id.toString()}`,
                      stream: false,
                      messages,
                    }),
                  });
                  
                  if (response.ok) {
                    const data = await response.json();
                    const agentResponse = data.choices?.[0]?.message?.content || '默认智能体暂无回复';
                    
                    agentResponses = [{
                      agentName: defaultAgentName,
                      content: agentResponse
                    }];
                  } else {
                    throw new Error(`Default agent API error: ${response.status} ${response.statusText}`);
                  }
                } catch (error) {
                  console.error('Error calling default agent:', error);
                  agentResponses = [{
                    agentName: defaultAgentName,
                    content: `默认智能体回复出错: ${error instanceof Error ? error.message : '未知错误'}`
                  }];
                }
              }
            } catch (error) {
              console.error('Error parsing dispatch response:', error);
              // 如果解析失败，将整个内容作为一个智能体的回复
              agentResponses = [{
                agentName: '调度中心',
                content: content
              }];
            }
            
            console.log('Final agent responses:', agentResponses);
          
          // 如果没有智能体回复，使用默认回复
          if (agentResponses.length === 0) {
            agentResponses = [{
              agentName: '系统',
              content: '调度中心未返回有效的智能体回复'
            }];
          }
          
          // 格式化返回的消息
          const formattedMessages = agentResponses.map((response, index) => {
            // 查找对应的智能体信息
            const agent = groupAgents.find(a => a.name === response.agentName);
            return {
              id: `${Date.now()}_${index}`,
              agentName: response.agentName,
              agentColor: agent?.color || '#6366f1',
              content: response.content,
              timestamp: new Date().toISOString(),
              isUser: false
            };
          });
          
          return NextResponse.json({
            success: true,
            messages: formattedMessages
          });
        } else {
          // 如果调度中心调用失败，返回模拟消息
          const randomAgent = groupAgents[Math.floor(Math.random() * groupAgents.length)];
          const mockMessage = {
            id: `${Date.now()}_0`,
            agentName: randomAgent.name,
            agentColor: randomAgent.color,
            content: `这是${randomAgent.name}的回复。群聊功能正在开发中，敬请期待！`,
            timestamp: new Date().toISOString(),
            isUser: false
          };
          
          return NextResponse.json({
            success: true,
            messages: [mockMessage]
          });
        }
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
            { success: false, error: '发送消息失败，请稍后重试', details: queryError instanceof Error ? queryError.message : 'Unknown error' },
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
    console.error('Error sending group chat message:', error);
    return NextResponse.json(
      { success: false, error: '发送消息失败', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// 获取群聊历史消息
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
        // 获取群聊详情
        let groupChat = await GroupChat.findById(id);
        
        // 如果通过id找不到，尝试通过我们映射的id字段查找
        if (!groupChat) {
          groupChat = await GroupChat.findOne({ id: id });
        }
        
        if (!groupChat) {
          return NextResponse.json(
            { success: false, error: '群聊不存在' },
            { status: 404 }
          );
        }
        
        // 这里应该从消息数据库中获取历史消息
        // 目前返回空数组，因为消息存储功能尚未实现
        return NextResponse.json({
          success: true,
          messages: []
        });
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
            { success: false, error: '获取群聊消息失败，请稍后重试', details: queryError instanceof Error ? queryError.message : 'Unknown error' },
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
    console.error('Error fetching group chat messages:', error);
    return NextResponse.json(
      { success: false, error: '获取群聊消息失败', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}