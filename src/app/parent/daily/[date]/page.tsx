'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface HourlyEntry {
  hour: number;
  activity_text: string;
  mood: string | null;
  comment: string;
}

interface DailyRecord {
  id: string;
  overall_mood: string | null;
  daily_comment: string;
}

interface FoodRecord {
  selected_items: string[];
  extra_snacks_text: string;
  outside_food_text: string;
}

interface MealPeriod {
  name: string;
  sections: {
    sectionName: string;
    items: string[];
  }[];
}

const moodEmojis: { [key: string]: string } = {
  excellent: '😄',
  good: '🙂',
  okay: '😐',
  bad: '😞',
  terrible: '😢',
  sleepy: '🥱',
};

function normalizeItemText(item: string) {
  return item.trim().replace(/\s+/g, ' ').toLowerCase();
}

function mergeMealPeriods(mealPeriods: MealPeriod[]): MealPeriod[] {
  const mealMap = new Map<string, { name: string; sections: Map<string, string[]> }>();

  for (const meal of mealPeriods) {
    const mealKey = meal.name.trim();
    if (!mealMap.has(mealKey)) {
      mealMap.set(mealKey, { name: mealKey, sections: new Map<string, string[]>() });
    }

    const targetMeal = mealMap.get(mealKey)!;

    for (const section of meal.sections || []) {
      const sectionKey = section.sectionName.trim();
      const existing = targetMeal.sections.get(sectionKey) || [];
      const seen = new Set(existing.map(normalizeItemText));

      for (const rawItem of section.items || []) {
        const item = rawItem.trim();
        if (!item) continue;
        const normalized = normalizeItemText(item);
        if (!seen.has(normalized)) {
          seen.add(normalized);
          existing.push(item);
        }
      }

      targetMeal.sections.set(sectionKey, existing);
    }
  }

  return Array.from(mealMap.values()).map((meal) => ({
    name: meal.name,
    sections: Array.from(meal.sections.entries()).map(([sectionName, items]) => ({
      sectionName,
      items,
    })),
  }));
}

export default function ParentDailyReadOnlyPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();

  const date = params.date as string;
  const studentId = searchParams.get('studentId') || '';

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [studentName, setStudentName] = useState('Student');
  const [dailyRecord, setDailyRecord] = useState<DailyRecord | null>(null);
  const [hourlyEntries, setHourlyEntries] = useState<HourlyEntry[]>([]);
  const [foodRecord, setFoodRecord] = useState<FoodRecord | null>(null);
  const [menu, setMenu] = useState<MealPeriod[]>([]);

  const loadData = async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session) {
        router.push('/auth/parent-login');
        return;
      }

      const parentId = data.session.user.id;

      if (!studentId) {
        setLoading(false);
        return;
      }

      // Verify link parent -> student
      const { data: link, error: linkError } = await supabase
        .from('parent_student_links')
        .select('id')
        .eq('parent_id', parentId)
        .eq('student_id', studentId)
        .maybeSingle();

      if (linkError || !link) {
        setLoading(false);
        return;
      }

      const { data: studentProfile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', studentId)
        .single();

      setStudentName((studentProfile as any)?.display_name || 'Student');

      const { data: record } = await supabase
        .from('daily_records')
        .select('id, overall_mood, daily_comment')
        .eq('student_id', studentId)
        .eq('date', date)
        .maybeSingle();

      setDailyRecord(record || null);

      if (record?.id) {
        const { data: entries } = await supabase
          .from('hourly_entries')
          .select('hour, activity_text, mood, comment')
          .eq('daily_record_id', record.id)
          .order('hour', { ascending: true });

        console.log('DEBUG: Fetching food record');
      const { data: food } = await supabase
          .from('food_records')
          .select('selected_items, extra_snacks_text, outside_food_text')
          .eq('daily_record_id', record.id)
          .maybeSingle();

        setHourlyEntries(entries || []);
        console.log('DEBUG: foodRecord fetched:', food);
        setFoodRecord(food || null);
      }

      const menuRes = await fetch(`/api/menu?date=${date}`);
      if (menuRes.ok) {
        const menuData = await menuRes.json();
        setMenu(mergeMealPeriods(menuData.mealPeriods || []));
      }

      if (showRefreshIndicator) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    };

  useEffect(() => {
    loadData();

    // Auto-refresh every 10 seconds for real-time updates
    const refreshInterval = setInterval(() => {
      loadData(true);
    }, 10000);

    return () => clearInterval(refreshInterval);
  }, [router, date, studentId]);

  const handleManualRefresh = () => {
    loadData(true);
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
        <div className="max-w-6xl mx-auto text-gray-600">Loading...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-blue-600">{studentName} · {date}</h1>
            <p className="text-gray-600">Parent read-only view · Auto-refreshes every 10s</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleManualRefresh}
              disabled={refreshing}
              className={`px-4 py-2 rounded ${refreshing ? 'bg-gray-300 text-gray-500' : 'bg-green-600 text-white hover:bg-green-700'}`}
            >
              {refreshing ? '🔄 Refreshing...' : '🔄 Refresh Now'}
            </button>
            <button
              onClick={() => router.push('/parent/dashboard')}
              className="px-4 py-2 text-blue-600 hover:bg-blue-100 rounded"
            >
              ← Back to Calendar
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Left: Food Selections by Meal */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">🍽️ Food Selections</h2>
            {!foodRecord || (foodRecord.selected_items || []).length === 0 ? (
              <p className="text-gray-500">No food selections yet.</p>
            ) : (
              <div className="space-y-4">
                {['Breakfast', 'Lunch', 'Dinner'].map((mealName) => {
                  const mealItems = (foodRecord.selected_items || []).filter(
                    (item) => item.startsWith(`${mealName}:`)
                  );
                  const cleanItems = mealItems.map((item) => item.replace(`${mealName}:`, ''));

                  return (
                    <div key={mealName}>
                      <h3 className="text-lg font-semibold text-indigo-600 mb-2">{mealName}</h3>
                      {cleanItems.length === 0 ? (
                        <p className="text-gray-500 text-sm">—</p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {cleanItems.map((item) => (
                            <span key={`${mealName}-${item}`} className="px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
                              {item}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}

                <div className="border-t pt-4 mt-4">
                  <div className="mb-3">
                    <p className="text-sm font-medium text-gray-700 mb-1">Extra Snacks</p>
                    <p className="text-gray-900 text-sm">{foodRecord.extra_snacks_text || '—'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-1">Outside Food</p>
                    <p className="text-gray-900 text-sm">{foodRecord.outside_food_text || '—'}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right: Daily Summary and Hourly Log */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Daily Summary</h2>
              {!dailyRecord ? (
                <p className="text-gray-500">No student record yet for this date.</p>
              ) : (
                <>
                  <div className="mb-4">
                    <p className="text-sm text-gray-600 mb-1">Overall Mood</p>
                    <div className="text-3xl">{dailyRecord.overall_mood ? moodEmojis[dailyRecord.overall_mood] : '—'}</div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Daily Comment</p>
                    <p className="text-gray-900 whitespace-pre-wrap">{dailyRecord.daily_comment || '—'}</p>
                  </div>
                </>
              )}
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Hourly Log</h2>
              {hourlyEntries.length === 0 ? (
                <p className="text-gray-500">No hourly entries yet.</p>
              ) : (
                <div className="space-y-3 max-h-[40vh] overflow-y-auto">
                  {hourlyEntries.map((entry) => (
                    <div key={entry.hour} className="border border-gray-200 rounded p-3 bg-gray-50">
                      <p className="font-semibold text-gray-900">{String(entry.hour).padStart(2, '0')}:00</p>
                      <p className="text-sm text-gray-700 mt-1"><span className="font-medium">Activity:</span> {entry.activity_text || '—'}</p>
                      <p className="text-sm text-gray-700 mt-1"><span className="font-medium">Mood:</span> {entry.mood ? moodEmojis[entry.mood] : '—'}</p>
                      <p className="text-sm text-gray-700 mt-1"><span className="font-medium">Note:</span> {entry.comment || '—'}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
