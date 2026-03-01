// Seed today's menu into Supabase
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const menuData = {
  date: '2026-02-28',
  location: 'Elm',
  meal_periods: [
    {
      name: 'Breakfast',
      sections: [
        {
          sectionName: 'Proteins',
          items: [
            '"JUST Egg" Huevos Rancheros',
            'Chicken Maple Sausage',
            'Local Organic Hard Boiled Eggs',
            'Cage Free Scrambled Eggs',
            'Yogurt, Berry, Granola Bar',
            'Breakfast Burrito Station'
          ]
        },
        {
          sectionName: 'Starches/Grains',
          items: [
            'Local Rolled Oats From Maine',
            'Buttermilk Pancakes',
            'Hash Brown Patties',
            'Malted Waffles',
            'Chocolate Granola',
            'Oats and Honey Granola'
          ]
        }
      ]
    },
    {
      name: 'Lunch',
      sections: [
        {
          sectionName: 'Proteins',
          items: [
            'Chipotle Plant Based Meatballs',
            'Chicken Piccata',
            'Spaghetti & Meatballs',
            'Grilled Chicken Breast',
            'Grilled Tofu Steak'
          ]
        },
        {
          sectionName: 'Vegetables',
          items: [
            'White Bean & Kale Soup',
            'Stewed Tomatoes with Basil',
            'Steamed Green Beans'
          ]
        },
        {
          sectionName: 'Starches/Grains',
          items: [
            'Sticky Rice'
          ]
        },
        {
          sectionName: 'Noodles',
          items: [
            'Gluten Free Fusilli Pasta',
            'Spaghetti Pasta'
          ]
        },
        {
          sectionName: 'Sauces',
          items: [
            'Basil Cream Sauce',
            'Marinara Sauce'
          ]
        }
      ]
    },
    {
      name: 'Dinner',
      sections: [
        {
          sectionName: 'Proteins',
          items: [
            'MYO Bao Bar',
            'Halal Asian Glazed Salmon',
            'BBQ Impossible Pizza',
            'Pepperoni Pizza',
            'Cheese Pizza',
            'Grilled Chicken Breast'
          ]
        },
        {
          sectionName: 'Starches/Grains',
          items: [
            'White Bean & Kale Soup',
            'Sticky Rice'
          ]
        },
        {
          sectionName: 'Vegetables',
          items: [
            'Roasted Harvest Squash',
            'Ginger Roasted Carrots',
            'Steamed Broccoli'
          ]
        },
        {
          sectionName: 'Desserts',
          items: [
            'Ice Cream Sandwiches & Novelties'
          ]
        }
      ]
    }
  ],
  fetched_at: new Date().toISOString(),
  source_url: 'https://epicuremenus.com/clients/exeter/online'
};

async function seedMenu() {
  console.log('Seeding menu for', menuData.date);

  const { data, error } = await supabase
    .from('cafeteria_menu_cache')
    .upsert(menuData, { onConflict: 'date,location' })
    .select();

  if (error) {
    console.error('Error seeding menu:', error);
    process.exit(1);
  }

  console.log('✅ Menu seeded successfully!');
  console.log('Data:', data);
}

seedMenu();
