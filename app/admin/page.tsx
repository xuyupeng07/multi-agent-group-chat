'use client';

import { useState, useEffect } from 'react';

interface Agent {
  _id: string;
  name: string;
  role: string;
  apiKey: string;
  color: string;
}

export default function AdminPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    try {
      const response = await fetch('/api/agents');
      if (response.ok) {
        const data = await response.json();
        setAgents(data);
      } else {
        setMessage('获取智能体列表失败');
      }
    } catch (error) {
      console.error('Error fetching agents:', error);
      setMessage('获取智能体列表失败');
    } finally {
      setLoading(false);
    }
  };

  const updateApiKey = async (agentName: string, newApiKey: string) => {
    setUpdating(agentName);
    setMessage('');
    
    try {
      const response = await fetch('/api/agents/update-key', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: agentName,
          apiKey: newApiKey,
        }),
      });

      if (response.ok) {
        setMessage(`${agentName} 的API密钥更新成功`);
        // 重新获取数据
        fetchAgents();
      } else {
        const error = await response.json();
        setMessage(`更新失败: ${error.error}`);
      }
    } catch (error) {
      console.error('Error updating API key:', error);
      setMessage('更新API密钥失败');
    } finally {
      setUpdating(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">API密钥管理</h1>
          
          {message && (
            <div className={`mb-4 p-4 rounded-lg ${
              message.includes('成功') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
              {message}
            </div>
          )}

          <div className="space-y-6">
            {agents.map((agent) => (
              <div key={agent._id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className={`w-4 h-4 rounded-full ${agent.color}`}></div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{agent.name}</h3>
                      <p className="text-sm text-gray-600">{agent.role}</p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      API密钥
                    </label>
                    <input
                      type="password"
                      value={agent.apiKey}
                      onChange={(e) => {
                        const newAgents = agents.map(a => 
                          a._id === agent._id ? { ...a, apiKey: e.target.value } : a
                        );
                        setAgents(newAgents);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="输入FastGPT API密钥"
                    />
                  </div>
                  
                  <button
                    onClick={() => updateApiKey(agent.name, agent.apiKey)}
                    disabled={updating === agent.name}
                    className={`px-4 py-2 rounded-md text-white font-medium ${
                      updating === agent.name
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    {updating === agent.name ? '更新中...' : '更新API密钥'}
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 p-4 bg-blue-50 rounded-lg">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">使用说明</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• 请为每个智能体配置对应的FastGPT API密钥</li>
              <li>• API密钥将安全存储在数据库中，不会暴露在代码里</li>
              <li>• 更新API密钥后，智能体将立即使用新的密钥</li>
              <li>• 如果API密钥为空，对应的智能体将无法正常工作</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}