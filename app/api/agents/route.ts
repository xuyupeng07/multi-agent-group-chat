import { connectMongoDB, Agent } from '@/lib/mongodb';
import { NextResponse } from 'next/server';

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
        // 获取所有智能体
        const agents = await Agent.find({}, 'name role introduction avatar apiKey color status baseUrl');
        
        // 返回智能体数据
        return NextResponse.json(agents);
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
            { error: '获取智能体失败，请稍后重试', details: queryError instanceof Error ? queryError.message : 'Unknown error' },
            { status: 500 }
          );
        }
      }
    }
    
    // 理论上不会执行到这里
    return NextResponse.json(
      { error: '未知错误' },
      { status: 500 }
    );
  } catch (error) {
    console.error('Error fetching agents:', error);
    return NextResponse.json(
      { error: '获取智能体失败', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
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
    // 获取请求数据
    const { name, role, introduction, avatar, apiKey, status, color, baseUrl } = await request.json();
    
    // 验证必填字段
    if (!name || !role) {
      return NextResponse.json({ error: '名称和角色是必填项' }, { status: 400 });
    }
    
    // 使用重试机制处理并发创建
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      try {
        // 创建新智能体，不需要自定义id字段，MongoDB会自动生成_id
        const newAgent = new Agent({
          name,
          role,
          introduction: introduction || '',
          avatar: avatar || '',
          apiKey: apiKey || '',
          status: status || 'offline',
          color: color || 'bg-blue-500',
          baseUrl: baseUrl || 'https://cloud.fastgpt.io/'
        });
        
        // 保存到数据库
        await newAgent.save();
        console.log(`New agent created with ID: ${newAgent._id} on attempt ${retryCount + 1}`);
        
        // 返回创建的智能体数据
        return NextResponse.json(newAgent, { status: 201 });
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
          let errorMessage = '创建智能体失败，请稍后重试';
          if (saveError instanceof Error) {
            if (saveError.message.includes('duplicate key')) {
              errorMessage = '已存在相同名称的智能体';
            } else {
              errorMessage = saveError.message;
            }
          }
          return NextResponse.json(
            { error: errorMessage, details: saveError instanceof Error ? saveError.message : 'Unknown error' },
            { status: 500 }
          );
        }
      }
    }
    
    // 理论上不会执行到这里
    return NextResponse.json(
      { error: '未知错误' },
      { status: 500 }
    );
  } catch (error) {
    console.error('Error creating agent:', error);
    // 添加更详细的错误信息
    let errorMessage = '创建智能体失败';
    if (error instanceof Error) {
      if (error.message.includes('duplicate key')) {
        errorMessage = '已存在相同名称的智能体';
      } else {
        errorMessage = error.message;
      }
    }
    return NextResponse.json(
      { error: errorMessage, details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
