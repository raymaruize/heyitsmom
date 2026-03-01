'use client';

import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50">
      <header className="bg-white border-b">
        <nav className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-indigo-600">Hey Its Mom</h1>
          <div className="space-x-4">
            <Link href="/auth/student-login" className="text-indigo-600 font-medium">Student</Link>
            <Link href="/auth/parent-login" className="bg-indigo-600 text-white px-4 py-2 rounded">Parent</Link>
          </div>
        </nav>
      </header>

      <section className="max-w-6xl mx-auto px-4 py-20 text-center">
        <h2 className="text-5xl font-bold text-gray-900 mb-6">Stay Connected</h2>
        <p className="text-xl text-gray-600 mb-12">Daily check-ins, mood tracking, and parent-student messaging.</p>

        <div className="grid md:grid-cols-3 gap-8 mb-12">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-4xl mb-4">📅</div>
            <h3 className="text-xl font-bold mb-3">Daily Calendar</h3>
            <p className="text-gray-600">Track mood and activities</p>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-4xl mb-4">🍽️</div>
            <h3 className="text-xl font-bold mb-3">Menu Updates</h3>
            <p className="text-gray-600">Cafeteria menu integration</p>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-4xl mb-4">💬</div>
            <h3 className="text-xl font-bold mb-3">Direct Messaging</h3>
            <p className="text-gray-600">Parent-student communication</p>
          </div>
        </div>

        <div className="space-x-4">
          <Link href="/auth/student-login" className="px-8 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Im a Student</Link>
          <Link href="/auth/parent-login" className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Im a Parent</Link>
        </div>
      </section>

      <footer className="bg-gray-900 text-gray-400 py-8 mt-12 text-center">
        <p>© 2026 Hey Its Mom</p>
      </footer>
    </main>
  );
}
