'use client';

import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <nav className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-indigo-600">Hey It's Mom</h1>
          <div className="space-x-4">
            <Link
              href="/auth/student-login"
              className="px-4 py-2 text-indigo-600 hover:text-indigo-700 font-medium"
            >
              Student Login
            </Link>
            <Link
              href="/auth/parent-login"
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
            >
              Parent Login
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
          Stay Connected with Your Boarding School Student
        </h2>
        <p className="text-xl text-gray-600 mb-12 max-w-3xl mx-auto">
          Daily check-ins, mood tracking, cafeteria menu updates, and parent-student messaging — all in one place.
        </p>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-4xl mb-4">📅</div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Daily Calendar</h3>
            <p className="text-gray-600">
              Students track their mood and activities throughout the day. Parents see an overview of their child's week.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-4xl mb-4">🍽️</div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Menu Updates</h3>
            <p className="text-gray-600">
              Real-time cafeteria menu from Exeter Academy. Students log what they ate. Parents know what their child is eating.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-4xl mb-4">💬</div>
            <h3 className="text-xl font-bold text-gray-900 mb-3">Direct Messaging</h3>
            <p className="text-gray-600">
              One daily message from parent to student. Students can reply. Simple, focused communication.
            </p>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/auth/student-login"
            className="px-8 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium text-lg"
          >
            I'm a Student
          </Link>
          <Link
            href="/auth/parent-login"
            className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-lg"
          >
            I'm a Parent
          </Link>
        </div>
      </section>

      {/* Privacy Note */}
      <section className="bg-gray-50 border-t border-gray-200 py-12">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-gray-600">
          <p className="mb-4">
            <strong>Privacy First:</strong> We don't track location, movement, or health data. Only daily mood, activities, and what your student ate.
          </p>
          <p>Built for boarding school families who want to stay connected without intrusion.</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8 mt-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm">
          <p>&copy; 2026 Hey It's Mom. All rights reserved.</p>
        </div>
      </footer>
    </main>
  );
}
