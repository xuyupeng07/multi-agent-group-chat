import pkg from '../lib/mongodb.js';
const { connectMongoDB, Chat } = pkg;

// 示例聊天数据
const sampleChats = [
  {
    title: "旅行计划咨询",
    messages: [
      {
        id: "1",
        agentName: "Me",
        agentColor: "bg-indigo-600",
        content: "我想了解一下去日本旅行的最佳季节",
        timestamp: new Date(),
        isUser: true
      },
      {
        id: "2",
        agentName: "旅行管家",
        agentColor: "bg-blue-500",
        content: "日本旅行的最佳季节取决于您的兴趣。春季（3-5月）是樱花季，景色优美但人多；秋季（9-11月）红叶美丽，气候宜人；夏季（6-8月）有祭典但炎热多雨；冬季（12-2月）适合滑雪且游客较少。您更倾向于哪种体验呢？",
        timestamp: new Date(),
        isUser: false
      }
    ]
  },
  {
    title: "酒店预订建议",
    messages: [
      {
        id: "3",
        agentName: "Me",
        agentColor: "bg-indigo-600",
        content: "请问在东京有哪些推荐的酒店",
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 昨天
        isUser: true
      },
      {
        id: "4",
        agentName: "旅行管家",
        agentColor: "bg-blue-500",
        content: "东京有许多优质酒店选择。豪华型：帝国酒店、新宿希尔顿；中高端：东京君悦、丸之内酒店；经济型：东横INN、APA酒店。位置建议：新宿、涩谷交通便利，银座购物方便，台场适合家庭。您的预算和出行需求是什么呢？",
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 昨天
        isUser: false
      }
    ]
  },
  {
    title: "美食推荐",
    messages: [
      {
        id: "5",
        agentName: "Me",
        agentColor: "bg-indigo-600",
        content: "在京都有什么必吃的美食吗",
        timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3天前
        isUser: true
      },
      {
        id: "6",
        agentName: "旅行管家",
        agentColor: "bg-blue-500",
        content: "京都美食丰富多样！必尝美食：怀石料理（高级传统料理）、京都汤豆腐、抹茶甜品、生八桥、京都拉面。推荐区域：祇园、先斗町、锦市场。老字号店铺：吉兆、菊乃井、三嶋亭大丸。您有特别的饮食偏好或预算考虑吗？",
        timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3天前
        isUser: false
      }
    ]
  },
  {
    title: "交通路线规划",
    messages: [
      {
        id: "7",
        agentName: "Me",
        agentColor: "bg-indigo-600",
        content: "从大阪到京都最方便的交通方式",
        timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 一周前
        isUser: true
      },
      {
        id: "8",
        agentName: "旅行管家",
        agentColor: "bg-blue-500",
        content: "大阪到京都最方便的方式是乘坐JR特急列车。推荐：1)JR京都线新快速（约30分钟，560日元）；2)阪急京都线特急（约40分钟，400日元）；3)京阪本线特急（约50分钟，440日元）。如持有JR Pass，建议选择JR线路。您将从大阪哪个区域出发呢？",
        timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 一周前
        isUser: false
      }
    ]
  }
];

async function seedChats() {
  try {
    console.log('开始连接数据库...');
    await connectMongoDB();
    
    console.log('检查是否已有示例数据...');
    const existingChats = await Chat.find({});
    
    if (existingChats.length > 0) {
      console.log(`数据库中已有 ${existingChats.length} 条聊天记录，跳过初始化`);
      return;
    }
    
    console.log('开始添加示例聊天数据...');
    
    // 添加示例数据
    for (const chatData of sampleChats) {
      const chat = new Chat(chatData);
      await chat.save();
      console.log(`已添加聊天记录: ${chat.title}`);
    }
    
    console.log('示例聊天数据初始化完成！');
  } catch (error) {
    console.error('初始化聊天数据时出错:', error);
  } finally {
    // 关闭数据库连接
    // mongoose.connection.close();
  }
}

// 运行初始化函数
seedChats();