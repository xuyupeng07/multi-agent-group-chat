import mongoose from 'mongoose';
import { connectMongoDB, Agent } from '../lib/mongodb';
import { AGENT_CONFIGS } from '../lib/fastgpt';

// 智能体介绍信息
const agentIntroductions = {
  '旅行管家': '专业的旅行规划助手，为您提供行程安排、景点推荐等服务',
  '交通助手': '提供实时交通信息、路线规划、票务查询等服务',
  '酒店管家': '帮助您预订酒店、查询酒店信息、提供住宿建议等',
  '美食顾问': '为您推荐当地美食、餐厅预订、菜单解析等服务'
};

// 种子数据函数
async function seedAgents() {
  try {
    // 连接数据库
    const connected = await connectMongoDB();
    if (!connected) {
      console.error('Failed to connect to MongoDB');
      return;
    }

    // 清空现有数据
    await Agent.deleteMany({});
    console.log('Cleared existing agent data');

    // 插入新数据
    const agents = Object.keys(AGENT_CONFIGS).map(agentKey => {
      const config = AGENT_CONFIGS[agentKey as keyof typeof AGENT_CONFIGS];
      return new Agent({
        name: config.name,
        role: agentIntroductions[agentKey as keyof typeof agentIntroductions],
        apiKey: config.apiKey,
        color: config.color
      });
    });

    await Agent.insertMany(agents);
    console.log('Successfully seeded agents:', agents.length);

    // 断开数据库连接
    await mongoose.disconnect();
    console.log('MongoDB disconnected');
  } catch (error) {
    console.error('Error seeding agents:', error);
    // 确保断开连接
    await mongoose.disconnect();
  }
}

// 执行种子数据函数
seedAgents();
