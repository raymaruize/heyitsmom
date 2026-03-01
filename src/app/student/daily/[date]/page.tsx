'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface HourlyEntry {
  id: string;
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

interface MealPeriod {
  name: string;
  sections: {
    sectionName: string;
    items: string[];
  }[];
}

interface FoodRecord {
  id: string;
  selected_items: string[];
  extra_snacks_text: string;
  outside_food_text: string;
}

const moodEmojis: { [key: string]: string } = {
  excellent: '😄',
  good: '🙂',
  okay: '😐',
  bad: '😞',
  terrible: '😢',
  sleepy: '🥱',
};

const HOURS = Array.from({ length: 16 }, (_, i) => i + 8); // 8-23

function normalizeItemText(item: string) {
  return item.trim().replace(/\s+/g, ' ').toLowerCase();
}

function mergeMealPeriods(mealPeriods: MealPeriod[]): MealPeriod[] {
  const mealMap = new Map<string, { name: string; sections: Map<string, string[]> }>();

  for (const meal of mealPeriods) {
    const mealKey = meal.name.trim();
    if (!mealMap.has(mealKey)) {
      mealMap.set(mealKey, {
        name: mealKey,
        sections: new Map<string, string[]>(),
      });
    }

    const targetMeal = mealMap.get(mealKey)!;

    for (const section of meal.sections || []) {
      const sectionKey = section.sectionName.trim();
      const existingItems = targetMeal.sections.get(sectionKey) || [];
      const seen = new Set(existingItems.map(normalizeItemText));

      for (const rawItem of section.items || []) {
        const item = rawItem.trim();
        if (!item) continue;
        const normalized = normalizeItemText(item);
        if (!seen.has(normalized)) {
          seen.add(normalized);
          existingItems.push(item);
        }
      }

      targetMeal.sections.set(sectionKey, existingItems);
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

export default function DailyDetailPage() {
  const router = useRouter();
  const params = useParams();
  const date = params.date as string;

  const [user, setUser] = useState<any>(null);
  const [dailyRecord, setDailyRecord] = useState<DailyRecord | null>(null);
  const [hourlyEntries, setHourlyEntries] = useState<HourlyEntry[]>([]);
  const [foodRecord, setFoodRecord] = useState<FoodRecord | null>(null);
  const [menu, setMenu] = useState<MealPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // State for pending text input changes (not saved until blur)
  const [pendingDailyComment, setPendingDailyComment] = useState('');
  const [pendingHourlyTexts, setPendingHourlyTexts] = useState<{[hour: number]: {activity?: string, comment?: string}}>({});
  const [pendingFoodTexts, setPendingFoodTexts] = useState<{extra_snacks?: string, outside_food?: string}>({});

  useEffect(() => {
    const checkAuth = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session) {
        router.push('/auth/student-login');
        return;
      }
      setUser(data.session.user);
      await loadData(data.session.user.id);
    };

    checkAuth();
  }, [router, date]);

  const loadData = async (userId: string) => {
    setLoading(true);
    try {
      // Get or create daily record
      let { data: record, error } = await supabase
        .from('daily_records')
        .select('*')
        .eq('student_id', userId)
        .eq('date', date)
        .single();

      if (error && error.code === 'PGRST116') {
        // Record doesn't exist, create it
        const { data: newRecord, error: createError } = await supabase
          .from('daily_records')
          .insert([
            {
              student_id: userId,
              date: date,
              overall_mood: null as string | null,
              daily_comment: '',
            },
          ] as any)
          .select()
          .single();

        if (createError) throw createError;
        record = newRecord;
      } else if (error) {
        throw error;
      }

      const typedRecord = record as DailyRecord | null;
      if (!typedRecord) throw new Error('Failed to load or create daily record');

      setDailyRecord(typedRecord);
      setPendingDailyComment(typedRecord.daily_comment || '');

      // Get hourly entries
      const { data: entries, error: entriesError } = await supabase
        .from('hourly_entries')
        .select('*')
        .eq('daily_record_id', typedRecord.id)
        .order('hour', { ascending: true });

      if (entriesError) throw entriesError;

      // Ensure all hours exist
      const typedEntries = (entries || []) as HourlyEntry[];
      const entriesMap = new Map(typedEntries.map(e => [e.hour, e]));
      const allEntries = HOURS.map(hour => 
        entriesMap.get(hour) || {
          id: `temp-${hour}`,
          hour,
          activity_text: '',
          mood: null,
          comment: '',
        }
      );

      setHourlyEntries(allEntries);

      // Initialize pending hourly texts
      const initialPendingHourly: {[hour: number]: {activity?: string, comment?: string}} = {};
      allEntries.forEach(entry => {
        initialPendingHourly[entry.hour] = {
          activity: entry.activity_text || '',
          comment: entry.comment || '',
        };
      });
      setPendingHourlyTexts(initialPendingHourly);


      // Get or create food record
      let { data: foodData, error: foodError } = await supabase
        .from('food_records')
        .select('*')
        .eq('daily_record_id', typedRecord.id)
        .single();

      if (foodError && foodError.code === 'PGRST116') {
        // Food record doesn't exist, create it
        const { data: newFoodRecord, error: createFoodError } = await supabase
          .from('food_records')
          .insert([
            {
              daily_record_id: typedRecord.id,
              selected_items: [],
              extra_snacks_text: '',
              outside_food_text: '',
            },
          ] as any)
          .select()
          .single();

        if (createFoodError) throw createFoodError;
        foodData = newFoodRecord;
      } else if (foodError) {
        throw foodError;
      }

      const typedFoodData = foodData as FoodRecord | null;
      setFoodRecord(typedFoodData);
      setPendingFoodTexts({
        extra_snacks: typedFoodData?.extra_snacks_text || '',
        outside_food: typedFoodData?.outside_food_text || '',
      });

      // Fetch menu for the selected date only
      try {
        const menuResponse = await fetch(`/api/menu?date=${date}`);
        if (menuResponse.ok) {
          const menuData = await menuResponse.json();
          setMenu(mergeMealPeriods(menuData.mealPeriods || []));
        } else {
          setMenu([]);
        }
      } catch {
        setMenu([]);
      }
    } catch (err: any) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const saveEntry = async (hour: number, field: string, value: any) => {
    if (!dailyRecord) return;

    setSaving(true);
    try {
      const entry = hourlyEntries.find(e => e.hour === hour);

      if (entry?.id.startsWith('temp-')) {
        // Create new entry
        const { data, error } = await supabase
          .from('hourly_entries')
          .insert([
            {
              daily_record_id: dailyRecord.id,
              hour,
              [field]: value,
            },
          ] as any)
          .select()
          .single();

        if (error) throw error;

        const typedData = data as HourlyEntry | null;
        if (!typedData) throw new Error('Failed to create hourly entry');

        setHourlyEntries(hourlyEntries.map(e => 
          e.hour === hour ? { ...e, ...typedData, id: typedData.id } : e
        ));
      } else if (entry?.id) {
        // Update existing entry
        const { error } = await (supabase as any)
          .from('hourly_entries')
          .update({ [field]: value })
          .eq('id', entry.id);

        if (error) throw error;

        setHourlyEntries(hourlyEntries.map(e => 
          e.hour === hour ? { ...e, [field]: value } : e
        ));
      }
    } catch (err: any) {
      console.error('Error saving entry:', err);
      alert('Failed to save entry');
    } finally {
      setSaving(false);
    }
  };

  const saveDailyRecord = async (field: string, value: any) => {
    if (!dailyRecord) return;

    setSaving(true);
    try {
      const { error } = await (supabase as any)
        .from('daily_records')
        .update({ [field]: value })
        .eq('id', dailyRecord.id);

      if (error) throw error;

      setDailyRecord({ ...dailyRecord, [field]: value });
    } catch (err: any) {
      console.error('Error saving daily record:', err);
      alert(`Failed to save: ${err.message || err}`);
    } finally {
      setSaving(false);
    }
  };

  const saveFoodRecord = async (field: string, value: any) => {
    if (!foodRecord) return;

    setSaving(true);
    try {
      const { error } = await (supabase as any)
        .from('food_records')
        .update({ [field]: value })
        .eq('id', foodRecord.id);

      if (error) throw error;

      setFoodRecord({ ...foodRecord, [field]: value });
    } catch (err: any) {
      console.error('Error saving food record:', err);
      alert('Failed to save food selections');
    } finally {
      setSaving(false);
    }
  };

  const toggleFoodItem = (item: string, mealPeriod: string) => {
    if (!foodRecord) return;

    const key = `${mealPeriod}:${item}`;
    const currentItems = foodRecord.selected_items || [];
    
    const updated = currentItems.includes(key)
      ? currentItems.filter(i => i !== key)
      : [...currentItems, key];

    saveFoodRecord('selected_items', updated);
  };

  const handleBackClick = () => {
    // Navigate back to dashboard
    router.push('/student/dashboard');
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-indigo-50 p-4">
        <div className="max-w-4xl mx-auto">
          <p className="text-lg text-gray-600">Loading...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-indigo-600">{date}</h1>
            <p className="text-gray-600">Track your day</p>
          </div>
          <button
            onClick={handleBackClick}
            className="px-4 py-2 text-indigo-600 hover:bg-indigo-100 rounded"
          >
            ← Back to Calendar
          </button>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-2 gap-6">
          {/* Left Column - Cafeteria Menu */}
          <div className="space-y-6">
            {/* Menu & Food Selection */}
            <div className="bg-white rounded-lg shadow-lg p-6 sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto">
              <h2 className="text-xl font-bold text-gray-900 mb-4">🍽️ Cafeteria Menu</h2>
              {menu.length > 0 ? (
                <div className="space-y-6">
                  {menu.map((mealPeriod) => (
                    <div key={mealPeriod.name} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                      <h3 className="text-lg font-semibold text-indigo-600 mb-2">{mealPeriod.name}</h3>
                      <div className="space-y-3">
                        {mealPeriod.sections.map((section) => (
                          <div key={`${mealPeriod.name}-${section.sectionName}`}>
                            <h4 className="text-sm font-medium text-gray-700 mb-2">{section.sectionName}</h4>
                            <div className="flex flex-wrap gap-2">
                              {section.items.map((item) => {
                                const key = `${mealPeriod.name}:${item}`;
                                const isSelected = (foodRecord?.selected_items || []).includes(key);
                                
                                return (
                                  <button
                                    key={`${mealPeriod.name}-${section.sectionName}-${item}`}
                                    onClick={() => toggleFoodItem(item, mealPeriod.name)}
                                    className={`px-3 py-2 rounded-full text-sm transition ${
                                      isSelected
                                        ? 'bg-indigo-500 text-white'
                                        : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                                    }`}
                                  >
                                    {isSelected && '✓ '}
                                    {item}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  {/* Extra Snacks & Outside Food */}
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Extra Snacks
                      </label>
                      <input
                        type="text"
                        value={pendingFoodTexts.extra_snacks ?? foodRecord?.extra_snacks_text ?? ''}
                        onChange={(e) => setPendingFoodTexts(prev => ({ ...prev, extra_snacks: e.target.value }))}
                        onBlur={() => saveFoodRecord('extra_snacks_text', pendingFoodTexts.extra_snacks || '')}
                        placeholder="Any additional snacks?"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Outside Food
                      </label>
                      <input
                        type="text"
                        value={pendingFoodTexts.outside_food ?? foodRecord?.outside_food_text ?? ''}
                        onChange={(e) => setPendingFoodTexts(prev => ({ ...prev, outside_food: e.target.value }))}
                        onBlur={() => saveFoodRecord('outside_food_text', pendingFoodTexts.outside_food || '')}
                        placeholder="Any food from outside?"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">No menu available for this date</p>
                  <p className="text-sm text-gray-400 mt-2">Menu will be synced daily</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Daily Schedule */}
          <div className="space-y-6">
            {/* Daily Mood & Comment */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Daily Summary</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Overall Mood
                  </label>
                  <div className="flex gap-2">
                    {Object.entries(moodEmojis).map(([mood, emoji]) => (
                      <button
                        key={mood}
                        onClick={() => saveDailyRecord('overall_mood', mood)}
                        className={`text-3xl px-3 py-2 rounded transition ${
                          dailyRecord?.overall_mood === mood
                            ? 'bg-indigo-200'
                            : 'bg-gray-100 hover:bg-gray-200'
                        }`}
                        title={mood}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Daily Comment
                  </label>
                  <textarea
                    value={pendingDailyComment}
                    onChange={(e) => setPendingDailyComment(e.target.value)}
                    onBlur={(e) => saveDailyRecord('daily_comment', e.target.value)}
                    placeholder="How was your day?"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    rows={3}
                  />
                </div>
              </div>
            </div>

            {/* Hourly Entries */}
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Hourly Log</h2>
              <div className="space-y-4">
                {hourlyEntries.map((entry) => (
                  <div key={entry.hour} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-bold text-gray-900">{String(entry.hour).padStart(2, '0')}:00</h3>
                    </div>

                    <div className="space-y-3">
                      {/* Activity */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Activity
                        </label>
                        <input
                          type="text"
                          value={pendingHourlyTexts[entry.hour]?.activity ?? entry.activity_text}
                          onChange={(e) => setPendingHourlyTexts(prev => ({
                            ...prev,
                            [entry.hour]: { ...prev[entry.hour], activity: e.target.value }
                          }))}
                          onBlur={() => saveEntry(entry.hour, 'activity_text', pendingHourlyTexts[entry.hour]?.activity || '')}
                          placeholder="What were you doing?"
                          className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                        />
                      </div>

                      {/* Mood */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Mood
                        </label>
                        <div className="flex gap-2">
                          {Object.entries(moodEmojis).map(([mood, emoji]) => (
                            <button
                              key={mood}
                              onClick={() => saveEntry(entry.hour, 'mood', mood)}
                              className={`text-2xl px-2 py-1 rounded transition ${
                                entry.mood === mood
                                  ? 'bg-indigo-200'
                                  : 'bg-gray-200 hover:bg-gray-300'
                              }`}
                              title={mood}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Comment */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Note
                        </label>
                        <input
                          type="text"
                          value={pendingHourlyTexts[entry.hour]?.comment ?? entry.comment}
                          onChange={(e) => setPendingHourlyTexts(prev => ({
                            ...prev,
                            [entry.hour]: { ...prev[entry.hour], comment: e.target.value }
                          }))}
                          onBlur={() => saveEntry(entry.hour, 'comment', pendingHourlyTexts[entry.hour]?.comment || '')}
                          placeholder="Any notes?"
                          className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Save Indicator */}
        {saving && (
          <div className="fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded">
            Saving...
          </div>
        )}
      </div>
    </main>
  );
}
