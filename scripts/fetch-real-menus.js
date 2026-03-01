// Fetch real menu data from Epicure API for multiple days
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const cheerio = require('cheerio');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fetchAndParseMenu(date) {
  try {
    const url = `https://epicuremenus.com/clients/exeter/online?date=${date}`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; HeyItsMom/1.0)',
      },
    });

    if (!response.ok) {
      return null;
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const mealPeriods = [];
    let currentMealPeriod = null;
    let currentSection = null;

    $('*').each((_, elem) => {
      const $elem = $(elem);
      const text = $elem.text().trim();

      // Detect meal period headings
      const mealPeriodMatch = text.match(/^(Breakfast|Brunch|Lunch|Dinner|Supper)$/);
      if (mealPeriodMatch && text.length < 20) {
        if (currentMealPeriod && currentSection && currentSection.items.length > 0) {
          currentMealPeriod.sections.push(currentSection);
        }

        currentMealPeriod = {
          name: mealPeriodMatch[1],
          sections: [],
        };
        currentSection = null;

        if (mealPeriodMatch[1]) {
          mealPeriods.push(currentMealPeriod);
        }
        return;
      }

      // Detect section headings
      const sectionMatch = text.match(/^(Proteins?|Vegetables?|Starches?\/Grains?|Fruits?|Desserts?|Breads?|Soups?|Sauces?|Noodles?|Sides?)$/);
      if (sectionMatch && currentMealPeriod && text.length < 30) {
        if (currentSection && currentSection.items.length > 0) {
          currentMealPeriod.sections.push(currentSection);
        }

        currentSection = {
          sectionName: sectionMatch[0],
          items: [],
        };
        return;
      }

      // Detect menu items
      if (
        currentMealPeriod &&
        currentSection &&
        text.length > 3 &&
        text.length < 200 &&
        !mealPeriodMatch &&
        !sectionMatch &&
        $elem.is('li, p, span, div') &&
        !text.includes('Menu')
      ) {
        currentSection.items.push(text);
      }
    });

    // Save last section
    if (currentMealPeriod && currentSection && currentSection.items.length > 0) {
      currentMealPeriod.sections.push(currentSection);
    }

    return {
      date,
      location: 'Elm',
      mealPeriods,
    };
  } catch (error) {
    console.error(`Error parsing menu for ${date}:`, error.message);
    return null;
  }
}

async function fetchRealMenus() {
  console.log('🔄 Fetching real menus from Epicure API...\n');

  const today = new Date('2026-02-28');
  const datesToFetch = [];

  // Add past 14 days
  for (let i = 14; i >= 1; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    datesToFetch.push(date.toISOString().split('T')[0]);
  }

  // Add today
  datesToFetch.push(today.toISOString().split('T')[0]);

  // Add future 14 days
  for (let i = 1; i <= 14; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    datesToFetch.push(date.toISOString().split('T')[0]);
  }

  console.log(`📅 Will fetch ${datesToFetch.length} days of menus`);
  console.log(`📅 Date range: ${datesToFetch[0]} to ${datesToFetch[datesToFetch.length - 1]}\n`);

  let successCount = 0;
  let errorCount = 0;
  let noDataCount = 0;

  for (const dateStr of datesToFetch) {
    try {
      console.log(`🌐 Fetching menu for ${dateStr}...`);
      
      // Use the actual menu scraper to fetch real data
      const parsed = await fetchAndParseMenu(dateStr);

      if (parsed && parsed.mealPeriods && parsed.mealPeriods.length > 0) {
        // Save to database
        const { data, error } = await supabase
          .from('cafeteria_menu_cache')
          .upsert({
            date: dateStr,
            location: 'Elm',
            meal_periods: parsed.mealPeriods,
            fetched_at: new Date().toISOString(),
            source_url: 'https://epicuremenus.com/clients/exeter/online'
          }, { onConflict: 'date,location' })
          .select();

        if (error) {
          console.error(`❌ Error saving menu for ${dateStr}:`, error.message);
          errorCount++;
        } else {
          console.log(`✅ Saved menu for ${dateStr} (${parsed.mealPeriods.length} meal periods)`);
          successCount++;
        }
      } else {
        console.log(`⚠️  No menu data available for ${dateStr}`);
        noDataCount++;
      }

      // Add a small delay to avoid overwhelming the API
      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (error) {
      console.error(`❌ Error fetching menu for ${dateStr}:`, error.message);
      errorCount++;
    }
  }

  console.log('\n=== Summary ===');
  console.log(`✅ Success: ${successCount}`);
  console.log(`⚠️  No data: ${noDataCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  console.log(`📅 Total processed: ${datesToFetch.length}`);
}

fetchRealMenus().catch(console.error);
