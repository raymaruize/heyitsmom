import * as cheerio from 'cheerio'

interface MealSection {
  sectionName: string
  items: string[]
}

interface MealPeriod {
  name: string
  sections: MealSection[]
}

interface ParsedMenu {
  date: string
  location: string
  mealPeriods: MealPeriod[]
}

/**
 * Fetch and parse the Epicure menu for Exeter Academy
 * Handles variable meal period names (Breakfast, Lunch, Dinner, Brunch, etc.)
 * Resilient to page structure changes
 */
export async function fetchAndParseMenu(date: string): Promise<ParsedMenu | null> {
  try {
    // Format date as YYYY-MM-DD
    const [year, month, day] = date.split('-')
    
    // Build URL - Epicure uses format like ?date=2026-02-28
    const url = `https://epicuremenus.com/clients/exeter/online?date=${date}`

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; HeyItsMom/1.0)',
      },
    })

    if (!response.ok) {
      console.error(`Failed to fetch menu: ${response.status}`)
      return null
    }

    const html = await response.text()
    const $ = cheerio.load(html)

    // Parse meal periods and sections
    const mealPeriods: MealPeriod[] = []
    let currentMealPeriod: MealPeriod | null = null
    let currentSection: MealSection | null = null

    // Main parsing loop - iterate through all content
    $('*').each((_, elem) => {
      const $elem = $(elem)
      const text = $elem.text().trim()

      // Detect meal period headings (e.g., "Breakfast", "Lunch", "Dinner", "Brunch")
      const mealPeriodMatch = text.match(/^(Breakfast|Brunch|Lunch|Dinner|Supper)$/)
      if (mealPeriodMatch && text.length < 20) {
        // Save previous meal period if exists
        if (currentMealPeriod && currentSection && currentSection.items.length > 0) {
          currentMealPeriod.sections.push(currentSection)
        }

        currentMealPeriod = {
          name: mealPeriodMatch[1],
          sections: [],
        }
        currentSection = null

        if (mealPeriodMatch[1]) {
          mealPeriods.push(currentMealPeriod)
        }
        return
      }

      // Detect section headings (e.g., "Proteins", "Vegetables", "Desserts", "Starches/Grains")
      const sectionMatch = text.match(/^(Proteins?|Vegetables?|Starches?\/Grains?|Fruits?|Desserts?|Breads?|Soups?|Sauces?|Noodles?|Sides?)$/)
      if (sectionMatch && currentMealPeriod && text.length < 30) {
        // Save previous section if exists
        if (currentSection && currentSection.items.length > 0) {
          currentMealPeriod.sections.push(currentSection)
        }

        currentSection = {
          sectionName: sectionMatch[0],
          items: [],
        }
        return
      }

      // Detect menu items - they're usually in <li> or similar, not headers
      // Items should be non-empty, reasonable length, and not be headings
      if (
        currentMealPeriod &&
        currentSection &&
        text.length > 3 &&
        text.length < 200 &&
        !mealPeriodMatch &&
        !sectionMatch &&
        $elem.is('li, p, span, div') &&
        // Avoid structural text
        !text.includes('Menu') &&
        !text.includes('Legend') &&
        !text.includes('Icon') &&
        !text.match(/^\d+|^Back|^Home|^Search/)
      ) {
        // Clean up the text - remove icon labels, etc.
        const cleanedText = text
          .replace(/🐝|🌾|🥬|🐟|🧀|🌶️/g, '') // Remove emoji
          .replace(/Antibiotic|Dairy|Egg|Farm-to-Table|Fish|Gluten|Halal|Peanuts|Pork|Shellfish|Soy|Tree Nuts|Vegan|Vegetarian|Wheat|Coconut|Sesame/gi, '')
          .trim()
          .replace(/\s+/g, ' ')

        if (
          cleanedText.length > 2 &&
          !cleanedText.match(/^\d+|Legend|Icon|Today|Hot Line/) &&
          !currentSection.items.includes(cleanedText)
        ) {
          currentSection.items.push(cleanedText)
        }
      }
    })

    // Save last section and meal period
    const finalMealPeriod = currentMealPeriod as MealPeriod | null
    if (finalMealPeriod) {
      const finalSection = currentSection as MealSection | null
      if (finalSection && finalSection.items.length > 0) {
        finalMealPeriod.sections.push(finalSection)
      }
    }

    // If we found meal periods, return the parsed menu
    if (mealPeriods.length > 0) {
      return {
        date,
        location: 'Elm', // Exeter's main dining hall
        mealPeriods,
      }
    }

    console.warn('No meal periods found in parsed menu')
    return null
  } catch (error) {
    console.error('Error fetching/parsing menu:', error)
    return null
  }
}

/**
 * Fetch menu for a date, trying to use cache first
 * Returns parsed menu structure
 */
export async function getMenuForDate(
  date: string,
  supabaseClient: any
): Promise<ParsedMenu | null> {
  try {
    // Check cache
    const { data: cachedMenu, error: cacheError } = await supabaseClient
      .from('cafeteria_menu_cache')
      .select('*')
      .eq('date', date)
      .eq('location', 'Elm')
      .single()

    // If cache exists and is less than 24 hours old, use it
    if (cachedMenu && !cacheError) {
      const fetchedAt = new Date(cachedMenu.fetched_at)
      const now = new Date()
      const hoursDiff = (now.getTime() - fetchedAt.getTime()) / (1000 * 60 * 60)

      if (hoursDiff < 24) {
        return cachedMenu.meal_periods
      }
    }

    // Cache miss or stale - fetch fresh
    const parsed = await fetchAndParseMenu(date)

    if (parsed) {
      // Update cache
      await supabaseClient
        .from('cafeteria_menu_cache')
        .upsert({
          date,
          location: 'Elm',
          meal_periods: parsed.mealPeriods,
          fetched_at: new Date().toISOString(),
          etag_or_hash: new Date().getTime().toString(),
        })
        .eq('date', date)
        .eq('location', 'Elm')

      return parsed
    }

    return null
  } catch (error) {
    console.error('Error getting menu:', error)
    return null
  }
}
