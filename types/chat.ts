export interface Message {
  id: string;
  agentName: string;
  agentColor: string;
  content: string;
  timestamp: string;
  isUser: boolean;
  isThinking?: boolean;
}

export interface Agent {
  id: string;
  name: string;
  role: string;
  introduction?: string;
  status: "online" | "busy" | "offline";
  color: string;
  avatar?: string;
  apiKey?: string;
  shareId?: string;
  baseUrl?: string;
}

export interface GroupChat {
  id: string;
  name: string;
  description?: string;
  agentIds: (Agent | string)[];
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  avatar?: string;
}

export interface ChatState {
  messages: Message[];
  inputValue: string;
  isComposing: boolean;
  isLoading: boolean;
  currentStreamingMessageId: string | null;
  showAgentList: boolean;
  mentionStartIndex: number | null;
  filteredAgents: string[];
  chatId: string | null;
  groupChatId?: string;
  currentView?: 'chat' | 'group';
}