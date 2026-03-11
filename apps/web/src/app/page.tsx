import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-white">
      <div className="text-center space-y-6 max-w-2xl px-4">
        <h1 className="text-5xl font-bold text-gray-900">
          Chat<span className="text-primary-600">Butler</span>
        </h1>
        <p className="text-xl text-gray-600">
          AI 智能对话管家 — 您的专属销售、媒体、商务助手
        </p>
        <div className="flex gap-4 justify-center pt-4">
          <Link
            href="/chat"
            className="px-6 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
          >
            开始对话
          </Link>
          <Link
            href="/auth/login"
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
          >
            登录
          </Link>
        </div>
      </div>
    </main>
  );
}
