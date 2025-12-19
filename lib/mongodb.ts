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

if (mongoose.models.GroupChat) {
  delete mongoose.models.GroupChat;
}

if (mongoose.models.GroupMessage) {
  delete mongoose.models.GroupMessage;
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
  avatar: {
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

// 定义群聊模式
const groupChatSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  agentIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Agent',
    required: true
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  createdBy: {
    type: String,
    default: 'system'
  },
  avatar: {
    type: String,
    default: ''
  }
});

// 定义群聊消息模式
const groupMessageSchema = new mongoose.Schema({
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GroupChat',
    required: true,
    index: true // 添加索引以优化查询性能
  },
  messageId: {
    type: String,
    required: true,
    unique: true // 确保消息ID唯一
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
    default: Date.now,
    index: true // 添加索引以优化时间排序查询
  },
  isUser: {
    type: Boolean,
    required: true
  },
  discussionMode: {
    type: Boolean,
    default: false // 标记是否为讨论模式的回复
  },
  roundNumber: {
    type: Number,
    default: 0 // 讨论模式的轮次编号
  }
});

// 创建消息、聊天、群聊和群聊消息模型
const Message = mongoose.model('Message', messageSchema);
const Chat = mongoose.model('Chat', chatSchema);
const GroupChat = mongoose.model('GroupChat', groupChatSchema);
const GroupMessage = mongoose.model('GroupMessage', groupMessageSchema);

// 连接MongoDB数据库
async function connectMongoDB() {
  try {
    // 如果已经连接，直接返回
    if (mongoose.connection.readyState === 1) {
      return true;
    }
    
    const connectionString = 'mongodb://root:57mbtz5p@dbconn.sealoshzh.site:38790/?directConnection=true';
    await mongoose.connect(connectionString, {
      dbName: 'agent',
      // 添加连接池配置以提高并发处理能力
      maxPoolSize: 10, // 最大连接数
      serverSelectionTimeoutMS: 5000, // 服务器选择超时
      socketTimeoutMS: 45000, // Socket超时
    });
    console.log('MongoDB connected successfully');
    return true;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    return false;
  }
}

export { connectMongoDB, Agent, Chat, Message, GroupChat, GroupMessage };