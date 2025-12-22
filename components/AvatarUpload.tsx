"use client";

import { useState, useRef, useEffect } from "react";
import { Camera, Upload } from "lucide-react";

interface AvatarUploadProps {
  currentAvatar?: string;
  onAvatarChange: (avatarBase64: string) => void;
  className?: string;
}

export function AvatarUpload({ currentAvatar, onAvatarChange, className = "" }: AvatarUploadProps) {
  const [avatarPreview, setAvatarPreview] = useState<string>(currentAvatar || "");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);


  // 当currentAvatar属性变化时，更新预览状态
  useEffect(() => {
    setAvatarPreview(currentAvatar || "");
  }, [currentAvatar]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      alert('请选择图片文件');
      return;
    }

    // 验证文件大小 (限制为2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('图片大小不能超过2MB');
      return;
    }

    setIsUploading(true);

    try {
      // 将文件转换为base64
      const base64 = await fileToBase64(file);
      setAvatarPreview(base64);
      onAvatarChange(base64);
    } catch (error) {
      console.error('上传头像失败:', error);
      alert('上传头像失败，请重试');
    } finally {
      setIsUploading(false);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Failed to convert file to base64'));
        }
      };
      reader.onerror = error => reject(error);
    });
  };

  const handleRemoveAvatar = () => {
    setAvatarPreview("");
    onAvatarChange("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className="relative group">
        <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          {avatarPreview ? (
            <img 
              src={avatarPreview} 
              alt="头像预览" 
              className="w-full h-full object-cover object-center p-1"
            />
          ) : (
            <Camera className="w-8 h-8 text-gray-400" />
          )}
        </div>
        
        <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
             onClick={() => fileInputRef.current?.click()}>
          <Upload className="w-6 h-6 text-white" />
        </div>
      </div>
      
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
      
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="text-xs bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {isUploading ? '上传中...' : '选择图片'}
        </button>
        
        {avatarPreview && (
          <button
            type="button"
            onClick={handleRemoveAvatar}
            className="text-xs bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
          >
            移除
          </button>
        )}
      </div>
      
      <p className="text-xs text-gray-500 mt-1">支持JPG、PNG格式，最大2MB</p>
    </div>
  );
}