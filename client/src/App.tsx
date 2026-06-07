import { Routes, Route, useLocation } from 'react-router-dom';
import HomePage from './pages/HomePage';
import PortfolioPage from './pages/PortfolioPage';
import RandomGallery from './pages/RandomGallery';

export default function App() {
  const location = useLocation();
  const isHome = location.pathname === '/' || location.pathname === '/archive';

  return (
    <div className="min-h-screen bg-amber-50">
      {/* 顶栏 */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur border-b border-amber-200">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <a href="/" className="text-xl font-bold text-amber-800 tracking-wide">
            🏡 家庭时光机
          </a>
          <nav className="flex gap-3 text-sm text-amber-700">
            <a href="/" className={`hover:text-amber-900 transition ${isHome ? 'font-semibold text-amber-900' : ''}`}>
              照片墙
            </a>
            <a href="/portfolio/yoyo" className={`hover:text-amber-900 transition ${location.pathname === '/portfolio/yoyo' ? 'font-semibold text-amber-900' : ''}`}>
              ✨ 悠悠
            </a>
            <a href="/portfolio/zhizhi" className={`hover:text-amber-900 transition ${location.pathname === '/portfolio/zhizhi' ? 'font-semibold text-amber-900' : ''}`}>
              🎨 之之
            </a>
            <a href="/portfolio/everyone" className={`hover:text-amber-900 transition ${location.pathname === '/portfolio/everyone' ? 'font-semibold text-amber-900' : ''}`}>
              💛 大家
            </a>
            <a href="/portfolio/explore" className={`hover:text-amber-900 transition ${location.pathname === '/portfolio/explore' ? 'font-semibold text-amber-900' : ''}`}>
              🌿 探索
            </a>
            <a href="/random" className={`hover:text-amber-900 transition ${location.pathname === '/random' ? 'font-semibold text-amber-900' : ''}`}>
              🔀 随便看看
            </a>
          </nav>
        </div>
      </header>

      {/* 主体 */}
      <main className={isHome ? 'max-w-6xl mx-auto px-4 py-6' : 'max-w-5xl mx-auto px-4 py-6'}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/archive" element={<HomePage />} />
          <Route path="/portfolio/:cat" element={<PortfolioPage />} />
          <Route path="/random" element={<RandomGallery />} />
        </Routes>
      </main>

      {/* 底栏 */}
      <footer className="text-center text-xs text-amber-400 py-8">
        家庭时光机 · 记录我们的美好瞬间 ❤️
      </footer>
    </div>
  );
}
