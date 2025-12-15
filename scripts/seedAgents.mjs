import mongoose from 'mongoose';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

// MongoDB连接字符串
const connectionString = 'mongodb://root:57mbtz5p@dbconn.sealoshzh.site:38790/?directConnection=true';

// 连接MongoDB数据库
async function connectMongoDB() {
  try {
    await mongoose.connect(connectionString, {
      dbName: 'agent'
    });
    console.log('MongoDB connected successfully');
    return true;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    return false;
  }
}

// 定义智能体模式
const agentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  role: {
    type: String,
    required: true
  },
  apiKey: {
    type: String,
    required: true
  },
  color: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// 创建智能体模型
const Agent = mongoose.models.Agent || mongoose.model('Agent', agentSchema);

// 智能体配置和介绍信息
// 注意：API key应该从数据库读取，这里仅作为初始化使用
// 实际使用时需要在数据库中配置正确的API key
const AGENT_CONFIGS = {
  '旅行管家': {
    apiKey: "", // 从数据库读取，这里留空
    name: "旅行管家",
    color: "bg-orange-500"
  },
  '交通助手': {
    apiKey: "", // 从数据库读取，这里留空
    name: "交通助手",
    color: "bg-blue-500"
  },
  '酒店管家': {
    apiKey: "", // 从数据库读取，这里留空
    name: "酒店管家",
    color: "bg-green-500"
  },
  '美食顾问': {
    apiKey: "", // 从数据库读取，这里留空
    name: "美食顾问",
    color: "bg-purple-500"
  }
};

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
      const config = AGENT_CONFIGS[agentKey];
      return new Agent({
        name: config.name,
        role: agentIntroductions[agentKey],
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
