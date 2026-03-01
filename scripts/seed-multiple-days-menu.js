// Seed menu for multiple days
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Sample menu variations for different days
const menuVariations = [
  {
    breakfast: {
      proteins: ['Scrambled Eggs', 'Bacon', 'Sausage Links', 'Greek Yogurt', 'Hard Boiled Eggs'],
      starches: ['French Toast', 'Hash Browns', 'Oatmeal', 'Bagels', 'English Muffins']
    },
    lunch: {
      proteins: ['Grilled Chicken', 'Beef Burgers', 'Veggie Burgers', 'Turkey Sandwich', 'Tuna Salad'],
      vegetables: ['Caesar Salad', 'Green Beans', 'Corn', 'Mixed Vegetables'],
      starches: ['French Fries', 'Rice Pilaf', 'Mashed Potatoes'],
      noodles: ['Spaghetti', 'Penne Pasta'],
      sauces: ['Marinara', 'Alfredo', 'Pesto']
    },
    dinner: {
      proteins: ['Roast Chicken', 'Baked Salmon', 'BBQ Ribs', 'Cheese Pizza', 'Pepperoni Pizza'],
      vegetables: ['Broccoli', 'Carrots', 'Garden Salad'],
      starches: ['Baked Potato', 'Wild Rice', 'Dinner Rolls'],
      desserts: ['Chocolate Cake', 'Ice Cream', 'Cookies']
    }
  },
  {
    breakfast: {
      proteins: ['Breakfast Burrito', 'Turkey Sausage', 'Egg White Omelet', 'Yogurt Parfait'],
      starches: ['Pancakes', 'Waffles', 'Granola', 'Toast', 'Croissants']
    },
    lunch: {
      proteins: ['Fish Tacos', 'Chicken Tenders', 'Grilled Tofu', 'Quesadilla'],
      vegetables: ['Tomato Soup', 'Steamed Broccoli', 'Coleslaw'],
      starches: ['Mexican Rice', 'Tortilla Chips'],
      noodles: ['Mac & Cheese', 'Lo Mein'],
      sauces: ['Cheese Sauce', 'Soy Ginger Sauce']
    },
    dinner: {
      proteins: ['Stir Fry Chicken', 'Beef Stew', 'Vegetable Lasagna', 'Margherita Pizza'],
      vegetables: ['Bok Choy', 'Zucchini', 'Sweet Corn'],
      starches: ['Fried Rice', 'Garlic Bread'],
      desserts: ['Brownies', 'Fruit Salad', 'Pudding']
    }
  },
  {
    breakfast: {
      proteins: ['Belgian Waffles', 'Canadian Bacon', 'Scrambled Tofu', 'Cottage Cheese'],
      starches: ['Blueberry Muffins', 'Cinnamon Rolls', 'Home Fries', 'Biscuits']
    },
    lunch: {
      proteins: ['Chicken Curry', 'Beef Tacos', 'Falafel', 'Egg Salad Sandwich'],
      vegetables: ['Minestrone Soup', 'Roasted Vegetables', 'Spinach Salad'],
      starches: ['Naan Bread', 'Basmati Rice'],
      noodles: ['Pad Thai', 'Ramen'],
      sauces: ['Curry Sauce', 'Teriyaki Sauce']
    },
    dinner: {
      proteins: ['Pork Chops', 'Grilled Shrimp', 'Eggplant Parmesan', 'Hawaiian Pizza'],
      vegetables: ['Brussels Sprouts', 'Cauliflower', 'Mixed Greens'],
      starches: ['Couscous', 'Quinoa'],
      desserts: ['Apple Pie', 'Tiramisu', 'Frozen Yogurt']
    }
  }
];

function generateMenuForDate(dateStr, variationIndex) {
  const variation = menuVariations[variationIndex % menuVariations.length];
  
  return {
    date: dateStr,
    location: 'Elm',
    meal_periods: [
      {
        name: 'Breakfast',
        sections: [
          {
            sectionName: 'Proteins',
            items: variation.breakfast.proteins
          },
          {
            sectionName: 'Starches/Grains',
            items: variation.breakfast.starches
          }
        ]
      },
      {
        name: 'Lunch',
        sections: [
          {
            sectionName: 'Proteins',
            items: variation.lunch.proteins
          },
          {
            sectionName: 'Vegetables',
            items: variation.lunch.vegetables
          },
          {
            sectionName: 'Starches/Grains',
            items: variation.lunch.starches
          },
          {
            sectionName: 'Noodles',
            items: variation.lunch.noodles
          },
          {
            sectionName: 'Sauces',
            items: variation.lunch.sauces
          }
        ]
      },
      {
        name: 'Dinner',
        sections: [
          {
            sectionName: 'Proteins',
            items: variation.dinner.proteins
          },
          {
            sectionName: 'Vegetables',
            items: variation.dinner.vegetables
          },
          {
            sectionName: 'Starches/Grains',
            items: variation.dinner.starches
          },
          {
            sectionName: 'Desserts',
            items: variation.dinner.desserts
          }
        ]
      }
    ],
    fetched_at: new Date().toISOString(),
    source_url: 'https://epicuremenus.com/clients/exeter/online'
  };
}

async function seedMultipleDays() {
  console.log('Seeding menus for multiple days...');

  const today = new Date('2026-02-28');
  const daysToSeed = [];

  // Add past 14 days
  for (let i = 14; i >= 1; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    daysToSeed.push(date.toISOString().split('T')[0]);
  }

  // Add today
  daysToSeed.push(today.toISOString().split('T')[0]);

  // Add future 14 days
  for (let i = 1; i <= 14; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    daysToSeed.push(date.toISOString().split('T')[0]);
  }

  console.log(`Will seed ${daysToSeed.length} days of menus`);

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < daysToSeed.length; i++) {
    const dateStr = daysToSeed[i];
    const menuData = generateMenuForDate(dateStr, i);

    const { data, error } = await supabase
      .from('cafeteria_menu_cache')
      .upsert(menuData, { onConflict: 'date,location' })
      .select();

    if (error) {
      console.error(`❌ Error seeding menu for ${dateStr}:`, error.message);
      errorCount++;
    } else {
      console.log(`✅ Seeded menu for ${dateStr}`);
      successCount++;
    }
  }

  console.log('\n=== Summary ===');
  console.log(`✅ Success: ${successCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  console.log(`📅 Date range: ${daysToSeed[0]} to ${daysToSeed[daysToSeed.length - 1]}`);
}

seedMultipleDays();
