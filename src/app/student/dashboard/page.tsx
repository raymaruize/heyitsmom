'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

interface DailyRecord {
  date: string;
  overall_mood: string | null;
}

const moodEmojis: { [key: string]: string } = {
  excellent: '😄',
  good: '🙂',
  okay: '😐',
  bad: '😞',
  terrible: '😢',
  sleepy: '🥱',
};

export default function StudentDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [records, setRecords] = useState<DailyRecord[]>([]);
  const [inviteCode, setInviteCode] = useState('');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session) {
        router.push('/auth/student-login');
        return;
      }
      setUser(data.session.user);
      await loadInviteCode(data.session.user.id);
      await loadRecords(data.session.user.id);
    };

    checkAuth();
  }, [router]);

  const loadInviteCode = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('invite_code')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error loading invite code:', error);
        throw error;
      }
      const inviteData = data as { invite_code: string | null } | null;
      setInviteCode(inviteData?.invite_code || '------');
    } catch (err) {
      console.error('Error loading invite code:', err);
      setInviteCode('------');
    }
  };

  const loadRecords = async (userId: string) => {
    setLoading(true);
    try {
      const year = currentDate.getFullYear();
      const month = String(currentDate.getMonth() + 1).padStart(2, '0');
      const startDate = `${year}-${month}-01`;
      
      const lastDay = new Date(year, currentDate.getMonth() + 1, 0).getDate();
      const endDate = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;

      const { data, error } = await supabase
        .from('daily_records')
        .select('date, overall_mood')
        .eq('student_id', userId)
        .gte('date', startDate)
        .lte('date', endDate);

      if (error) throw error;
      setRecords(((data || []) as DailyRecord[]));
    } catch (err: any) {
      console.error('Error loading records:', err);
    } finally {
      setLoading(false);
    }
  };

  const getRecordForDate = (date: Date): DailyRecord | undefined => {
    const dateStr = date.toISOString().split('T')[0];
    return records.find(r => r.date === dateStr);
  };

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const handleDateClick = (day: number) => {
    const dateStr = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
      .toISOString()
      .split('T')[0];
    router.push(`/student/daily/${dateStr}`);
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50 p-8">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-xl text-gray-600">Loading...</p>
        </div>
      </main>
    );
  }

  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  const days = [];

  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }

  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <header className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-indigo-600">My Calendar</h1>
              <p className="text-gray-600">Track your daily mood and activities</p>
            </div>
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                router.push('/');
              }}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Sign Out
            </button>
          </div>

          <div className="mt-3 bg-gray-50 border border-gray-200 rounded px-3 py-2">
            <p className="text-xs text-gray-600">Your Parent Invite Code</p>
            <p className="text-sm font-mono tracking-wider text-gray-800 mt-0.5">226257</p>
            <p className="text-xs text-gray-500 mt-0.5">Share this 6-digit code with your parent during their sign-up.</p>
          </div>
        </header>

        {/* Calendar */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          {/* Month Navigation */}
          <div className="flex justify-between items-center mb-6">
            <button
              onClick={goToPreviousMonth}
              className="px-4 py-2 text-indigo-600 hover:bg-indigo-50 rounded"
            >
              ← Previous
            </button>
            <h2 className="text-2xl font-bold text-gray-900">{monthName}</h2>
            <button
              onClick={goToNextMonth}
              className="px-4 py-2 text-indigo-600 hover:bg-indigo-50 rounded"
            >
              Next →
            </button>
          </div>

          {/* Day Names */}
          <div className="grid grid-cols-7 gap-2 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center font-bold text-gray-600 py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-2">
            {days.map((day, idx) => {
              if (day === null) {
                return <div key={`empty-${idx}`} className="aspect-square"></div>;
              }

              const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
              const record = getRecordForDate(date);
              const isToday = new Date().toDateString() === date.toDateString();

              return (
                <button
                  key={day}
                  onClick={() => handleDateClick(day)}
                  className={`aspect-square rounded-lg p-2 flex flex-col items-center justify-center text-sm font-medium transition ${
                    isToday
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-50 text-gray-900 hover:bg-indigo-100'
                  } border ${isToday ? 'border-indigo-700' : 'border-gray-200'}`}
                >
                  <div className="text-lg">{day}</div>
                  {record?.overall_mood && (
                    <div className="text-2xl">{moodEmojis[record.overall_mood]}</div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="mt-8 bg-white rounded-lg shadow p-4">
          <p className="font-bold text-gray-900 mb-4">Mood Legend:</p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {Object.entries(moodEmojis).map(([mood, emoji]) => (
              <div key={mood} className="text-center">
                <div className="text-3xl mb-2">{emoji}</div>
                <p className="text-sm text-gray-600 capitalize">{mood}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
