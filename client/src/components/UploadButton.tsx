import { useState, useRef } from 'react';

interface UploadButtonProps {
  onUploaded: () => void;
}

export default function UploadButton({ onUploaded }: UploadButtonProps) {
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append('photo', file);

      const res = await fetch('/api/photos/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || '上传失败');
      }

      setMessage('上传成功！');
      onUploaded();

      // 3 秒后清除提示
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      setMessage(err.message || '上传失败');
      setTimeout(() => setMessage(null), 5000);
    } finally {
      setUploading(false);
      // 清空 input 以允许重复选同一文件
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-30 flex flex-col items-end gap-2">
      {/* 提示信息 */}
      {message && (
        <div
          className={`px-4 py-2 rounded-lg shadow text-sm font-medium ${
            message.includes('成功')
              ? 'bg-green-500 text-white'
              : 'bg-red-500 text-white'
          }`}
        >
          {message}
        </div>
      )}

      {/* 上传按钮 */}
      <label
        className={`
          flex items-center gap-2 px-5 py-3 rounded-full shadow-lg cursor-pointer
          transition-all font-medium text-white
          ${
            uploading
              ? 'bg-amber-400 cursor-wait'
              : 'bg-amber-600 hover:bg-amber-700 active:scale-95'
          }
        `}
      >
        {uploading ? (
          <>
            <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            上传中...
          </>
        ) : (
          <>
            <span className="text-xl">📷</span>
            上传照片
          </>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFile}
          className="hidden"
          disabled={uploading}
        />
      </label>
    </div>
  );
}
