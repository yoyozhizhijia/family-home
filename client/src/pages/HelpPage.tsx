import { useNavigate } from 'react-router-dom';

export default function HelpPage() {
  const navigate = useNavigate();

  const steps = [
    { emoji: '🔑', title: '第一步：加入家庭', desc: '关注公众号后，发送暗号（向管理员索取），然后回复你的家庭昵称，即可成为家庭成员。' },
    { emoji: '📷', title: '第二步：上传照片', desc: '直接在公众号对话框发送照片，照片会自动保存到家庭时光机。也可以打开下方链接，进入作品集页面，点击「添加作品」上传。' },
    { emoji: '📊', title: '第三步：查看动态', desc: '向公众号发送「今日动态 / 昨日动态 / 本周动态」，立刻收到照片统计和快捷入口。' },
    { emoji: '💬', title: '第四步：互动留言', desc: '在照片墙点开任意照片，底部可以写留言，家人们都能看到。' },
    { emoji: '⬇', title: '保存照片', desc: '点开照片后，右上角有「⬇ 保存」按钮，可以把喜欢的照片下载到手机。' },
    { emoji: '🔀', title: '随便看看', desc: '点顶栏「🔀 随便看看」，照片随机排列，每次都有惊喜。' },
  ];

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <div className="text-center mb-6">
        <div className="text-5xl mb-3">📖</div>
        <h1 className="text-2xl font-bold text-amber-800">操作手册</h1>
        <p className="text-amber-500 text-sm mt-1">欢迎来到家庭时光机 ❤️</p>
      </div>

      <div className="space-y-4">
        {steps.map((s, i) => (
          <div key={i} className="bg-white rounded-xl p-4 shadow-sm border border-amber-100 flex gap-3">
            <div className="text-2xl flex-shrink-0 w-10 text-center">{s.emoji}</div>
            <div>
              <h3 className="font-semibold text-amber-800 text-sm">{s.title}</h3>
              <p className="text-amber-600 text-xs mt-1 leading-relaxed">{s.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 text-center space-y-2">
        <button
          onClick={() => navigate('/')}
          className="px-6 py-2.5 bg-amber-600 text-white rounded-full text-sm font-medium hover:bg-amber-700 transition"
        >
          📷 进入照片墙
        </button>
        <p className="text-amber-300 text-xs">有问题找管理员～</p>
      </div>
    </div>
  );
}
