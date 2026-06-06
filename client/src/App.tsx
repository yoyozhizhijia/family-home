import { Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';

export default function App() {
  return (
    <div className="min-h-screen bg-amber-50">
      {/* 顶栏 */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur border-b border-amber-200">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <a href="/" className="text-xl font-bold text-amber-800 tracking-wide">
            🏡 家庭时光
          </a>
          <nav className="flex gap-4 text-sm text-amber-700">
            <a href="/" className="hover:text-amber-900 transition">照片墙</a>
            <a href="/archive" className="hover:text-amber-900 transition">归档</a>
          </nav>
        </div>
      </header>

      {/* 主体 */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/archive" element={<HomePage />} />
        </Routes>
      </main>

      {/* 底栏 */}
      <footer className="text-center text-xs text-amber-400 py-8">
        家庭时光 · 记录我们的美好瞬间 ❤️
      </footer>
    </div>
  );
}
