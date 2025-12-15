import mongoose from 'mongoose';

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

export { connectMongoDB, Agent };
