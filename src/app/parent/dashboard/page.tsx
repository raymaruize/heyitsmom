'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface LinkedStudent {
  id: string;
  display_name: string;
}

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

export default function ParentDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [linkedStudents, setLinkedStudents] = useState<LinkedStudent[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [records, setRecords] = useState<DailyRecord[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session) {
        router.push('/auth/parent-login');
        return;
      }

      const parentId = data.session.user.id;

      // Use API route to get linked students (bypasses RLS)
      try {
        const response = await fetch(`/api/parent/linked-students?parentId=${parentId}`);
        const result = await response.json();

        if (!response.ok) {
          console.error('API error:', result.error);
          setLoading(false);
          return;
        }

        const students = (result.students || []).map((s: any) => ({
          id: s.id,
          display_name: s.display_name || 'Student',
        }));

        setLinkedStudents(students);
        setSelectedStudentId(students[0]?.id || '');
      } catch (err) {
        console.error('Failed to fetch linked students:', err);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [router]);

  useEffect(() => {
    const loadRecords = async () => {
      if (!selectedStudentId) {
        setRecords([]);
        return;
      }

      const year = currentDate.getFullYear();
      const month = String(currentDate.getMonth() + 1).padStart(2, '0');
      const startDate = `${year}-${month}-01`;
      const lastDay = new Date(year, currentDate.getMonth() + 1, 0).getDate();
      const endDate = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;

      const { data, error } = await supabase
        .from('daily_records')
        .select('date, overall_mood')
        .eq('student_id', selectedStudentId)
        .gte('date', startDate)
        .lte('date', endDate);

      if (error) {
        console.error(error);
        setRecords([]);
        return;
      }

      setRecords(data || []);
    };

    loadRecords();
  }, [selectedStudentId, currentDate]);

  const getRecordForDate = (date: Date): DailyRecord | undefined => {
    const dateStr = date.toISOString().split('T')[0];
    return records.find((r) => r.date === dateStr);
  };

  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

  const days: Array<number | null> = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-8">
        <div className="max-w-4xl mx-auto text-center text-gray-600">Loading...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
      <div className="max-w-5xl mx-auto">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-blue-600">Parent Dashboard</h1>
            <p className="text-gray-600">Read-only view of your student's daily page</p>
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
        </header>

        {linkedStudents.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-6 text-gray-700">
            No linked student found. Please sign up again with a valid student invite code.
          </div>
        ) : (
          <>
            <div className="bg-white rounded-lg shadow p-4 mb-4 flex items-center gap-3">
              <label className="text-sm font-medium text-gray-700">Student:</label>
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded"
              >
                {linkedStudents.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.display_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex justify-between items-center mb-6">
                <button
                  onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
                  className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded"
                >
                  ← Previous
                </button>
                <h2 className="text-2xl font-bold text-gray-900">{monthName}</h2>
                <button
                  onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
                  className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded"
                >
                  Next →
                </button>
              </div>

              <div className="grid grid-cols-7 gap-2 mb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <div key={day} className="text-center font-bold text-gray-600 py-2">
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-2">
                {days.map((day, idx) => {
                  if (day === null) return <div key={`empty-${idx}`} className="aspect-square" />;

                  const dateObj = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                  const dateStr = dateObj.toISOString().split('T')[0];
                  const record = getRecordForDate(dateObj);

                  return (
                    <button
                      key={day}
                      onClick={() => router.push(`/parent/daily/${dateStr}?studentId=${selectedStudentId}`)}
                      className="aspect-square rounded-lg p-2 flex flex-col items-center justify-center text-sm font-medium bg-gray-50 text-gray-900 hover:bg-blue-100 border border-gray-200"
                    >
                      <div className="text-lg">{day}</div>
                      {record?.overall_mood && <div className="text-2xl">{moodEmojis[record.overall_mood]}</div>}
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
