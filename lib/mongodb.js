import mongoose from 'mongoose';

// 删除已存在的模型
if (mongoose.models.Agent) {
  delete mongoose.models.Agent;
}

if (mongoose.models.Chat) {
  delete mongoose.models.Chat;
}

if (mongoose.models.Message) {
  delete mongoose.models.Message;
}

// 重新定义智能体模式
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
  introduction: {
    type: String,
    default: ''
  },
  apiKey: {
    type: String,
    required: true
  },
  color: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['online', 'busy', 'offline'],
    default: 'offline'
  },
  baseUrl: {
    type: String,
    default: 'https://cloud.fastgpt.io/'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// 创建智能体模型
const Agent = mongoose.model('Agent', agentSchema);

// 定义消息模式
const messageSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true
  },
  agentName: {
    type: String,
    required: true
  },
  agentColor: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  isUser: {
    type: Boolean,
    required: true
  }
});

// 定义聊天模式
const chatSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  messages: [messageSchema]
});

// 创建消息和聊天模型
const Message = mongoose.model('Message', messageSchema);
const Chat = mongoose.model('Chat', chatSchema);

// 连接MongoDB数据库
async function connectMongoDB() {
  try {
    const connectionString = 'mongodb://root:57mbtz5p@dbconn.sealoshzh.site:38790/?directConnection=true';
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

const mongodbExports = { connectMongoDB, Agent, Chat, Message };
export { connectMongoDB, Agent, Chat, Message };
export default mongodbExports;