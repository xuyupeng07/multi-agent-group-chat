"use client";

import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Agent } from "@/types/chat";

interface AgentAvatarProps {
  agent: Agent;
  size?: "sm" | "md" | "lg";
  showStatus?: boolean;
  className?: string;
}

const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();
};

const getSizeClass = (size: "sm" | "md" | "lg") => {
  switch (size) {
    case "sm":
      return "h-8 w-8";
    case "md":
      return "h-10 w-10";
    case "lg":
      return "h-12 w-12";
    default:
      return "h-10 w-10";
  }
};

export function AgentAvatar({ agent, size = "md", showStatus = false, className = "" }: AgentAvatarProps) {
  const sizeClass = getSizeClass(size);
  const [imageLoaded, setImageLoaded] = React.useState(false);
  const [imageError, setImageError] = React.useState(false);
  
  // 调试代码
  console.log(`AgentAvatar for ${agent.name}:`, {
    hasAvatar: !!agent.avatar,
    avatarLength: agent.avatar?.length || 0,
    avatarStart: agent.avatar ? agent.avatar.substring(0, 50) + (agent.avatar.length > 50 ? "..." : "") : "",
    avatarType: agent.avatar?.startsWith('data:') ? 'Data URL' : 'Invalid format',
    imageLoaded,
    imageError,
    agentColor: agent.color,
    agentId: agent.id
  });
  
  // 重置状态当agent改变时
  React.useEffect(() => {
    setImageLoaded(false);
    setImageError(false);
  }, [agent.avatar]);
  
  // 如果没有头像，直接显示回退
  if (!agent.avatar) {
    console.log(`No avatar for agent ${agent.name}, showing fallback`);
    return (
      <div className={`relative ${className}`}>
        <div className={`${sizeClass} border-2 border-white dark:border-zinc-900 rounded-full relative overflow-hidden ${agent.color}`}>
          <div className="w-full h-full flex items-center justify-center text-white font-medium">
            {getInitials(agent.name)}
          </div>
        </div>
        
        {showStatus && (
          <span 
            className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white dark:border-zinc-900 ${
              agent.status === 'online' ? 'bg-green-500' :
              agent.status === 'busy' ? 'bg-yellow-500' : 'bg-red-500'
            }`} 
          />
        )}
      </div>
    );
  }
  
  return (
    <div className={`relative ${className}`}>
      <div className={`${sizeClass} border-2 border-white dark:border-zinc-900 rounded-full relative overflow-hidden`}>
        <img 
          src={agent.avatar} 
          alt={agent.name}
          className={`w-full h-full object-cover object-center p-1 ${imageLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-200`}
          onLoad={() => {
            console.log(`Image loaded successfully for ${agent.name}`);
            setImageLoaded(true);
          }}
          onError={(e) => {
            console.error(`Image failed to load for ${agent.name}:`, e);
            setImageError(true);
          }}
        />
        
        {/* 头像回退显示 */}
        <div className={`absolute inset-0 ${agent.color} text-white font-medium flex items-center justify-center ${imageError || !imageLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-200`}>
          {getInitials(agent.name)}
        </div>
      </div>
      
      {showStatus && (
        <span 
          className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white dark:border-zinc-900 ${
            agent.status === 'online' ? 'bg-green-500' :
            agent.status === 'busy' ? 'bg-yellow-500' : 'bg-red-500'
          }`} 
        />
      )}
    </div>
  );
}