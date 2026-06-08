import { useState, useRef } from 'react';

interface UploadButtonProps {
  onUploaded: () => void;
  authedFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

export default function UploadButton({ onUploaded, authedFetch }: UploadButtonProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [nickname, setNickname] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadFile = async (file: File): Promise<boolean> => {
    const formData = new FormData();
    formData.append('photo', file);
    if (nickname.trim()) {
      formData.append('uploader', nickname.trim());
    }
    const res = await authedFetch('/api/photos/upload', {
      method: 'POST',
      body: formData,
    });
    return res.ok;
  };

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setMessage(null);

    let success = 0;
    let fail = 0;
    const total = files.length;

    for (let i = 0; i < files.length; i++) {
      setProgress(`${i + 1} / ${total}`);
      try {
        const ok = await uploadFile(files[i]);
        if (ok) success++;
        else fail++;
      } catch {
        fail++;
      }
    }

    setUploading(false);
    setProgress(null);

    if (fail === 0) {
      setMessage(`✅ ${success} 张照片上传成功！\n查看照片墙：https://family-home.onrender.com`);
    } else {
      setMessage(`⚠️ 成功 ${success} 张，失败 ${fail} 张`);
    }

    onUploaded();
    setTimeout(() => setMessage(null), 3000);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-30 flex flex-col items-end gap-2">
      {message && (
        <div
          className={`px-4 py-2 rounded-lg shadow text-sm font-medium ${
            message.startsWith('✅')
              ? 'bg-green-500 text-white'
              : message.startsWith('⚠️')
                ? 'bg-amber-500 text-white'
                : 'bg-red-500 text-white'
          }`}
        >
          {message}
        </div>
      )}

      {/* 昵称输入框 */}
      <div className="bg-white/90 backdrop-blur rounded-full shadow-lg px-4 py-2 flex items-center gap-2">
        <span className="text-xs text-amber-600 whitespace-nowrap">我是</span>
        <input
          type="text"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="你的昵称"
          maxLength={15}
          className="w-24 text-xs px-2 py-1 border border-amber-200 rounded-full bg-amber-50 text-amber-800 placeholder-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
      </div>

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
            {progress || '上传中...'}
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
          multiple
          onChange={handleFiles}
          className="hidden"
          disabled={uploading}
        />
      </label>
    </div>
  );
}
