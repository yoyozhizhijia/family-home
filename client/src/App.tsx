import { Routes, Route, useLocation } from 'react-router-dom';
import HomePage from './pages/HomePage';
import PortfolioPage from './pages/PortfolioPage';
import RandomGallery from './pages/RandomGallery';
import HelpPage from './pages/HelpPage';

export default function App() {
  const location = useLocation();
  const isHome = location.pathname === '/' || location.pathname === '/archive';

  return (
    <div className="min-h-screen bg-amber-50">
      {/* 顶栏 */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur border-b border-amber-200">
        {/* 标题行 */}
        <div className="max-w-6xl mx-auto px-4 h-12 flex items-center">
          <a href="/" className="text-lg sm:text-xl font-bold text-amber-800 tracking-wide">
            🏡 家庭时光机
          </a>
        </div>
        {/* 导航行：桌面横排，手机横向滚动 */}
        <nav className="max-w-6xl mx-auto px-2 pb-2 flex gap-1 overflow-x-auto scrollbar-hide text-sm text-amber-700 whitespace-nowrap">
          <a href="/" className={`px-3 py-1.5 rounded-full transition ${isHome ? 'bg-amber-600 text-white font-semibold' : 'hover:bg-amber-100'}`}>
            照片墙
          </a>
          <a href="/portfolio/yoyo" className={`px-3 py-1.5 rounded-full transition ${location.pathname === '/portfolio/yoyo' ? 'bg-amber-600 text-white font-semibold' : 'hover:bg-amber-100'}`}>
            ✨ 悠悠
          </a>
          <a href="/portfolio/zhizhi" className={`px-3 py-1.5 rounded-full transition ${location.pathname === '/portfolio/zhizhi' ? 'bg-amber-600 text-white font-semibold' : 'hover:bg-amber-100'}`}>
            🎨 之之
          </a>
          <a href="/portfolio/everyone" className={`px-3 py-1.5 rounded-full transition ${location.pathname === '/portfolio/everyone' ? 'bg-amber-600 text-white font-semibold' : 'hover:bg-amber-100'}`}>
            💛 大家
          </a>
          <a href="/portfolio/explore" className={`px-3 py-1.5 rounded-full transition ${location.pathname === '/portfolio/explore' ? 'bg-amber-600 text-white font-semibold' : 'hover:bg-amber-100'}`}>
            🌿 探索
          </a>
          <a href="/random" className={`px-3 py-1.5 rounded-full transition ${location.pathname === '/random' ? 'bg-amber-600 text-white font-semibold' : 'hover:bg-amber-100'}`}>
            🔀 随便看看
          </a>
        </nav>
      </header>

      {/* 主体 */}
      <main className={isHome ? 'max-w-6xl mx-auto px-4 py-6' : 'max-w-5xl mx-auto px-4 py-6'}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/archive" element={<HomePage />} />
          <Route path="/portfolio/:cat" element={<PortfolioPage />} />
          <Route path="/random" element={<RandomGallery />} />
          <Route path="/help" element={<HelpPage />} />
        </Routes>
      </main>

      {/* 底栏 */}
      <footer className="text-center text-xs text-amber-400 py-8">
        家庭时光机 · 记录我们的美好瞬间 ❤️
      </footer>
    </div>
  );
}
