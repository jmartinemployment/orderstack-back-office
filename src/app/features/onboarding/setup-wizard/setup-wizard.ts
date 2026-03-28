import { Component, signal, computed, inject, ChangeDetectionStrategy, DestroyRef, OnInit } from '@angular/core';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
  BusinessVertical,
  BusinessAddress,
  DevicePosMode,
  BusinessCategory,
  BUSINESS_CATEGORIES,
  REVENUE_RANGES,
  DEVICE_POS_MODE_CATALOG,
  defaultTaxLocaleConfig,
  defaultBusinessHours,
  PaymentProcessor,
} from '../../../models/index';
import { MarketplaceProviderType } from '../../../models/delivery.model';
import { Router } from '@angular/router';
import { PlatformService, OnboardingPayload, OnboardingResult } from '../../../services/platform';
import { AuthService } from '../../../services/auth';
import { DeviceService } from '../../../services/device';
import { MenuService } from '../../../services/menu';
import { PwaInstallService } from '../../../services/pwa-install';
import { PaymentConnectService } from '../../../services/payment-connect';
import { InventoryService } from '../../../services/inventory';

const US_STATES = [
  { code: 'AL', name: 'Alabama' }, { code: 'AK', name: 'Alaska' }, { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' }, { code: 'CA', name: 'California' }, { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' }, { code: 'DE', name: 'Delaware' }, { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' }, { code: 'HI', name: 'Hawaii' }, { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' }, { code: 'IN', name: 'Indiana' }, { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' }, { code: 'KY', name: 'Kentucky' }, { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' }, { code: 'MD', name: 'Maryland' }, { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' }, { code: 'MN', name: 'Minnesota' }, { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' }, { code: 'MT', name: 'Montana' }, { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' }, { code: 'NH', name: 'New Hampshire' }, { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' }, { code: 'NY', name: 'New York' }, { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' }, { code: 'OH', name: 'Ohio' }, { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' }, { code: 'PA', name: 'Pennsylvania' }, { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' }, { code: 'SD', name: 'South Dakota' }, { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' }, { code: 'UT', name: 'Utah' }, { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' }, { code: 'WA', name: 'Washington' }, { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' }, { code: 'WY', name: 'Wyoming' }, { code: 'DC', name: 'Washington DC' },
];

const ZIP_REGEX = /^\d{5}(-\d{4})?$/;


// --- Cuisine options ---
const CUISINES = [
  'American',
  'BBQ',
  'Bakery / Coffee Shop',
  'Bar / Brewery / Lounge',
  'Chinese',
  'Ice Cream',
  'Indian',
  'Italian',
  'Japanese',
  'Korean',
  'Mediterranean',
  'Mexican',
  'Seafood',
  'Soul Food',
  'Tex-Mex',
  'Thai',
  'Vietnamese',
];

// Cuisine -> menu template mapping (IDs must match backend MENU_TEMPLATES in menu-templates.ts)
const CUISINE_TEMPLATE_MAP: Record<string, string> = {
  'American': 'tmpl-american-grill',
  'BBQ': 'tmpl-bbq',
  'Bakery / Coffee Shop': 'tmpl-coffee-shop',
  'Bar / Brewery / Lounge': 'tmpl-bar-and-grill',
  'Chinese': 'tmpl-asian',
  'Ice Cream': 'tmpl-ice-cream',
  'Indian': 'tmpl-indian',
  'Italian': 'tmpl-pizza-restaurant',
  'Japanese': 'tmpl-asian',
  'Korean': 'tmpl-asian',
  'Mediterranean': 'tmpl-mediterranean',
  'Mexican': 'tmpl-taco-truck',
  'Seafood': 'tmpl-seafood',
  'Soul Food': 'tmpl-american-grill',
  'Tex-Mex': 'tmpl-taco-truck',
  'Thai': 'tmpl-asian',
  'Vietnamese': 'tmpl-asian',
};

// Default template for cuisines without a specific match
const DEFAULT_MENU_TEMPLATE = 'tmpl-bar-and-grill';

// --- Cuisine -> Inventory Template Map ---
interface InventoryTemplate {
  name: string;
  unit: string;
  category: string;
  minStock: number;
}

const CUISINE_INVENTORY_MAP: Record<string, InventoryTemplate[]> = {
  'American': [
    { name: 'Ground Beef', unit: 'lb', category: 'Protein', minStock: 20 },
    { name: 'Chicken Breast', unit: 'lb', category: 'Protein', minStock: 15 },
    { name: 'Bacon', unit: 'lb', category: 'Protein', minStock: 10 },
    { name: 'Cheddar Cheese', unit: 'lb', category: 'Dairy', minStock: 10 },
    { name: 'American Cheese', unit: 'lb', category: 'Dairy', minStock: 8 },
    { name: 'Butter', unit: 'lb', category: 'Dairy', minStock: 5 },
    { name: 'Hamburger Buns', unit: 'dozen', category: 'Bakery', minStock: 10 },
    { name: 'Lettuce', unit: 'head', category: 'Produce', minStock: 10 },
    { name: 'Tomato', unit: 'lb', category: 'Produce', minStock: 10 },
    { name: 'Onion', unit: 'lb', category: 'Produce', minStock: 10 },
    { name: 'Pickle', unit: 'gal', category: 'Condiments', minStock: 2 },
    { name: 'Ketchup', unit: 'gal', category: 'Condiments', minStock: 2 },
    { name: 'Mustard', unit: 'gal', category: 'Condiments', minStock: 2 },
    { name: 'Frying Oil', unit: 'gal', category: 'Oil & Fat', minStock: 5 },
    { name: 'Frozen Fries', unit: 'lb', category: 'Frozen', minStock: 30 },
    { name: 'All-Purpose Flour', unit: 'lb', category: 'Dry Goods', minStock: 10 },
  ],
  'BBQ': [
    { name: 'Brisket', unit: 'lb', category: 'Protein', minStock: 30 },
    { name: 'Pork Shoulder', unit: 'lb', category: 'Protein', minStock: 25 },
    { name: 'Pork Ribs', unit: 'rack', category: 'Protein', minStock: 15 },
    { name: 'Chicken Wings', unit: 'lb', category: 'Protein', minStock: 20 },
    { name: 'Smoked Sausage', unit: 'lb', category: 'Protein', minStock: 10 },
    { name: 'Coleslaw Mix', unit: 'lb', category: 'Produce', minStock: 10 },
    { name: 'Onion', unit: 'lb', category: 'Produce', minStock: 8 },
    { name: 'Jalapeno', unit: 'lb', category: 'Produce', minStock: 3 },
    { name: 'BBQ Sauce', unit: 'gal', category: 'Condiments', minStock: 5 },
    { name: 'Hot Sauce', unit: 'gal', category: 'Condiments', minStock: 2 },
    { name: 'Dry Rub Seasoning', unit: 'lb', category: 'Spices', minStock: 5 },
    { name: 'Hickory Wood Chips', unit: 'bag', category: 'Supplies', minStock: 5 },
    { name: 'Cornbread Mix', unit: 'lb', category: 'Dry Goods', minStock: 10 },
    { name: 'Baked Beans', unit: 'can', category: 'Dry Goods', minStock: 20 },
    { name: 'Hamburger Buns', unit: 'dozen', category: 'Bakery', minStock: 10 },
  ],
  'Bakery / Coffee Shop': [
    { name: 'All-Purpose Flour', unit: 'lb', category: 'Dry Goods', minStock: 50 },
    { name: 'Bread Flour', unit: 'lb', category: 'Dry Goods', minStock: 25 },
    { name: 'Granulated Sugar', unit: 'lb', category: 'Dry Goods', minStock: 25 },
    { name: 'Powdered Sugar', unit: 'lb', category: 'Dry Goods', minStock: 10 },
    { name: 'Butter', unit: 'lb', category: 'Dairy', minStock: 20 },
    { name: 'Heavy Cream', unit: 'qt', category: 'Dairy', minStock: 10 },
    { name: 'Whole Milk', unit: 'gal', category: 'Dairy', minStock: 10 },
    { name: 'Eggs', unit: 'dozen', category: 'Dairy', minStock: 10 },
    { name: 'Espresso Beans', unit: 'lb', category: 'Beverages', minStock: 15 },
    { name: 'Vanilla Extract', unit: 'oz', category: 'Spices', minStock: 16 },
    { name: 'Cocoa Powder', unit: 'lb', category: 'Dry Goods', minStock: 5 },
    { name: 'Chocolate Chips', unit: 'lb', category: 'Dry Goods', minStock: 10 },
    { name: 'Yeast', unit: 'lb', category: 'Dry Goods', minStock: 3 },
    { name: 'Oat Milk', unit: 'carton', category: 'Dairy', minStock: 10 },
  ],
  'Bar / Brewery / Lounge': [
    { name: 'Vodka', unit: 'bottle', category: 'Spirits', minStock: 6 },
    { name: 'Rum', unit: 'bottle', category: 'Spirits', minStock: 4 },
    { name: 'Tequila', unit: 'bottle', category: 'Spirits', minStock: 4 },
    { name: 'Whiskey', unit: 'bottle', category: 'Spirits', minStock: 6 },
    { name: 'Gin', unit: 'bottle', category: 'Spirits', minStock: 3 },
    { name: 'Triple Sec', unit: 'bottle', category: 'Spirits', minStock: 2 },
    { name: 'Simple Syrup', unit: 'bottle', category: 'Mixers', minStock: 4 },
    { name: 'Lime Juice', unit: 'bottle', category: 'Mixers', minStock: 6 },
    { name: 'Cranberry Juice', unit: 'bottle', category: 'Mixers', minStock: 4 },
    { name: 'Soda Water', unit: 'case', category: 'Mixers', minStock: 4 },
    { name: 'Tonic Water', unit: 'case', category: 'Mixers', minStock: 3 },
    { name: 'Lime', unit: 'each', category: 'Produce', minStock: 30 },
    { name: 'Lemon', unit: 'each', category: 'Produce', minStock: 20 },
    { name: 'Olives', unit: 'jar', category: 'Condiments', minStock: 4 },
    { name: 'Bitters', unit: 'bottle', category: 'Mixers', minStock: 3 },
  ],
  'Chinese': [
    { name: 'Jasmine Rice', unit: 'lb', category: 'Dry Goods', minStock: 50 },
    { name: 'Soy Sauce', unit: 'gal', category: 'Condiments', minStock: 3 },
    { name: 'Sesame Oil', unit: 'bottle', category: 'Oil & Fat', minStock: 4 },
    { name: 'Oyster Sauce', unit: 'bottle', category: 'Condiments', minStock: 3 },
    { name: 'Rice Vinegar', unit: 'bottle', category: 'Condiments', minStock: 3 },
    { name: 'Chicken Thigh', unit: 'lb', category: 'Protein', minStock: 20 },
    { name: 'Pork Belly', unit: 'lb', category: 'Protein', minStock: 10 },
    { name: 'Shrimp', unit: 'lb', category: 'Protein', minStock: 10 },
    { name: 'Tofu', unit: 'block', category: 'Protein', minStock: 10 },
    { name: 'Bok Choy', unit: 'lb', category: 'Produce', minStock: 8 },
    { name: 'Green Onion', unit: 'bunch', category: 'Produce', minStock: 10 },
    { name: 'Ginger', unit: 'lb', category: 'Produce', minStock: 3 },
    { name: 'Garlic', unit: 'lb', category: 'Produce', minStock: 3 },
    { name: 'Cornstarch', unit: 'lb', category: 'Dry Goods', minStock: 5 },
    { name: 'Wonton Wrappers', unit: 'pack', category: 'Frozen', minStock: 10 },
    { name: 'Vegetable Oil', unit: 'gal', category: 'Oil & Fat', minStock: 5 },
  ],
  'Ice Cream': [
    { name: 'Heavy Cream', unit: 'gal', category: 'Dairy', minStock: 10 },
    { name: 'Whole Milk', unit: 'gal', category: 'Dairy', minStock: 10 },
    { name: 'Granulated Sugar', unit: 'lb', category: 'Dry Goods', minStock: 20 },
    { name: 'Vanilla Extract', unit: 'oz', category: 'Spices', minStock: 16 },
    { name: 'Cocoa Powder', unit: 'lb', category: 'Dry Goods', minStock: 5 },
    { name: 'Strawberry', unit: 'lb', category: 'Produce', minStock: 10 },
    { name: 'Waffle Cones', unit: 'case', category: 'Supplies', minStock: 5 },
    { name: 'Sprinkles', unit: 'lb', category: 'Toppings', minStock: 5 },
    { name: 'Hot Fudge', unit: 'gal', category: 'Toppings', minStock: 3 },
    { name: 'Caramel Sauce', unit: 'gal', category: 'Toppings', minStock: 3 },
    { name: 'Whipped Cream', unit: 'can', category: 'Toppings', minStock: 10 },
    { name: 'Maraschino Cherries', unit: 'jar', category: 'Toppings', minStock: 4 },
  ],
  'Indian': [
    { name: 'Basmati Rice', unit: 'lb', category: 'Dry Goods', minStock: 30 },
    { name: 'Chickpea Flour', unit: 'lb', category: 'Dry Goods', minStock: 10 },
    { name: 'Lentils (Dal)', unit: 'lb', category: 'Dry Goods', minStock: 15 },
    { name: 'Chicken Thigh', unit: 'lb', category: 'Protein', minStock: 20 },
    { name: 'Lamb', unit: 'lb', category: 'Protein', minStock: 10 },
    { name: 'Paneer', unit: 'lb', category: 'Dairy', minStock: 8 },
    { name: 'Yogurt', unit: 'qt', category: 'Dairy', minStock: 10 },
    { name: 'Ghee', unit: 'lb', category: 'Oil & Fat', minStock: 5 },
    { name: 'Onion', unit: 'lb', category: 'Produce', minStock: 15 },
    { name: 'Tomato', unit: 'lb', category: 'Produce', minStock: 15 },
    { name: 'Ginger', unit: 'lb', category: 'Produce', minStock: 3 },
    { name: 'Garlic', unit: 'lb', category: 'Produce', minStock: 3 },
    { name: 'Garam Masala', unit: 'lb', category: 'Spices', minStock: 3 },
    { name: 'Turmeric', unit: 'lb', category: 'Spices', minStock: 2 },
    { name: 'Cumin Seeds', unit: 'lb', category: 'Spices', minStock: 2 },
    { name: 'Naan Bread', unit: 'dozen', category: 'Bakery', minStock: 10 },
  ],
  'Italian': [
    { name: 'Pasta (Assorted)', unit: 'lb', category: 'Dry Goods', minStock: 30 },
    { name: 'San Marzano Tomatoes', unit: 'can', category: 'Dry Goods', minStock: 20 },
    { name: 'Olive Oil', unit: 'gal', category: 'Oil & Fat', minStock: 5 },
    { name: 'Mozzarella', unit: 'lb', category: 'Dairy', minStock: 15 },
    { name: 'Parmesan', unit: 'lb', category: 'Dairy', minStock: 8 },
    { name: 'Ricotta', unit: 'lb', category: 'Dairy', minStock: 5 },
    { name: 'Italian Sausage', unit: 'lb', category: 'Protein', minStock: 10 },
    { name: 'Chicken Breast', unit: 'lb', category: 'Protein', minStock: 15 },
    { name: 'Shrimp', unit: 'lb', category: 'Protein', minStock: 8 },
    { name: 'Garlic', unit: 'lb', category: 'Produce', minStock: 5 },
    { name: 'Basil', unit: 'bunch', category: 'Produce', minStock: 10 },
    { name: 'Onion', unit: 'lb', category: 'Produce', minStock: 10 },
    { name: 'Pizza Dough', unit: 'ball', category: 'Bakery', minStock: 20 },
    { name: 'Italian Bread', unit: 'loaf', category: 'Bakery', minStock: 10 },
    { name: 'Red Wine Vinegar', unit: 'bottle', category: 'Condiments', minStock: 3 },
  ],
  'Japanese': [
    { name: 'Sushi Rice', unit: 'lb', category: 'Dry Goods', minStock: 30 },
    { name: 'Soy Sauce', unit: 'gal', category: 'Condiments', minStock: 3 },
    { name: 'Rice Vinegar', unit: 'bottle', category: 'Condiments', minStock: 4 },
    { name: 'Mirin', unit: 'bottle', category: 'Condiments', minStock: 3 },
    { name: 'Sake (Cooking)', unit: 'bottle', category: 'Condiments', minStock: 2 },
    { name: 'Salmon (Sashimi Grade)', unit: 'lb', category: 'Protein', minStock: 10 },
    { name: 'Tuna (Sashimi Grade)', unit: 'lb', category: 'Protein', minStock: 8 },
    { name: 'Shrimp', unit: 'lb', category: 'Protein', minStock: 8 },
    { name: 'Tofu', unit: 'block', category: 'Protein', minStock: 8 },
    { name: 'Nori Sheets', unit: 'pack', category: 'Dry Goods', minStock: 10 },
    { name: 'Wasabi', unit: 'tube', category: 'Condiments', minStock: 6 },
    { name: 'Pickled Ginger', unit: 'lb', category: 'Condiments', minStock: 3 },
    { name: 'Sesame Seeds', unit: 'lb', category: 'Spices', minStock: 2 },
    { name: 'Panko Breadcrumbs', unit: 'lb', category: 'Dry Goods', minStock: 5 },
  ],
  'Korean': [
    { name: 'Short Grain Rice', unit: 'lb', category: 'Dry Goods', minStock: 30 },
    { name: 'Gochujang', unit: 'lb', category: 'Condiments', minStock: 5 },
    { name: 'Gochugaru', unit: 'lb', category: 'Spices', minStock: 3 },
    { name: 'Soy Sauce', unit: 'gal', category: 'Condiments', minStock: 3 },
    { name: 'Sesame Oil', unit: 'bottle', category: 'Oil & Fat', minStock: 4 },
    { name: 'Beef Short Rib', unit: 'lb', category: 'Protein', minStock: 15 },
    { name: 'Pork Belly', unit: 'lb', category: 'Protein', minStock: 12 },
    { name: 'Chicken Thigh', unit: 'lb', category: 'Protein', minStock: 15 },
    { name: 'Tofu', unit: 'block', category: 'Protein', minStock: 10 },
    { name: 'Kimchi', unit: 'lb', category: 'Produce', minStock: 15 },
    { name: 'Napa Cabbage', unit: 'head', category: 'Produce', minStock: 8 },
    { name: 'Green Onion', unit: 'bunch', category: 'Produce', minStock: 10 },
    { name: 'Garlic', unit: 'lb', category: 'Produce', minStock: 3 },
    { name: 'Korean Glass Noodles', unit: 'lb', category: 'Dry Goods', minStock: 5 },
  ],
  'Mediterranean': [
    { name: 'Olive Oil', unit: 'gal', category: 'Oil & Fat', minStock: 5 },
    { name: 'Pita Bread', unit: 'dozen', category: 'Bakery', minStock: 15 },
    { name: 'Hummus', unit: 'lb', category: 'Condiments', minStock: 10 },
    { name: 'Feta Cheese', unit: 'lb', category: 'Dairy', minStock: 8 },
    { name: 'Lamb', unit: 'lb', category: 'Protein', minStock: 12 },
    { name: 'Chicken Thigh', unit: 'lb', category: 'Protein', minStock: 15 },
    { name: 'Chickpeas', unit: 'lb', category: 'Dry Goods', minStock: 10 },
    { name: 'Tahini', unit: 'jar', category: 'Condiments', minStock: 4 },
    { name: 'Cucumber', unit: 'lb', category: 'Produce', minStock: 8 },
    { name: 'Tomato', unit: 'lb', category: 'Produce', minStock: 10 },
    { name: 'Red Onion', unit: 'lb', category: 'Produce', minStock: 8 },
    { name: 'Lemon', unit: 'each', category: 'Produce', minStock: 20 },
    { name: 'Garlic', unit: 'lb', category: 'Produce', minStock: 3 },
    { name: 'Basmati Rice', unit: 'lb', category: 'Dry Goods', minStock: 20 },
    { name: 'Dried Oregano', unit: 'lb', category: 'Spices', minStock: 2 },
  ],
  'Mexican': [
    { name: 'Corn Tortillas', unit: 'dozen', category: 'Bakery', minStock: 20 },
    { name: 'Flour Tortillas', unit: 'dozen', category: 'Bakery', minStock: 15 },
    { name: 'Ground Beef', unit: 'lb', category: 'Protein', minStock: 20 },
    { name: 'Chicken Thigh', unit: 'lb', category: 'Protein', minStock: 15 },
    { name: 'Carnitas (Pork)', unit: 'lb', category: 'Protein', minStock: 15 },
    { name: 'Cheddar Cheese', unit: 'lb', category: 'Dairy', minStock: 10 },
    { name: 'Sour Cream', unit: 'lb', category: 'Dairy', minStock: 5 },
    { name: 'Black Beans', unit: 'can', category: 'Dry Goods', minStock: 20 },
    { name: 'Rice', unit: 'lb', category: 'Dry Goods', minStock: 20 },
    { name: 'Avocado', unit: 'each', category: 'Produce', minStock: 20 },
    { name: 'Lime', unit: 'each', category: 'Produce', minStock: 30 },
    { name: 'Cilantro', unit: 'bunch', category: 'Produce', minStock: 10 },
    { name: 'Jalapeno', unit: 'lb', category: 'Produce', minStock: 5 },
    { name: 'Onion', unit: 'lb', category: 'Produce', minStock: 10 },
    { name: 'Salsa', unit: 'gal', category: 'Condiments', minStock: 4 },
    { name: 'Cumin', unit: 'lb', category: 'Spices', minStock: 2 },
  ],
  'Seafood': [
    { name: 'Salmon Fillet', unit: 'lb', category: 'Protein', minStock: 15 },
    { name: 'Shrimp', unit: 'lb', category: 'Protein', minStock: 15 },
    { name: 'Cod Fillet', unit: 'lb', category: 'Protein', minStock: 10 },
    { name: 'Lobster Tail', unit: 'each', category: 'Protein', minStock: 10 },
    { name: 'Crab Meat', unit: 'lb', category: 'Protein', minStock: 8 },
    { name: 'Clams', unit: 'lb', category: 'Protein', minStock: 10 },
    { name: 'Mussels', unit: 'lb', category: 'Protein', minStock: 8 },
    { name: 'Butter', unit: 'lb', category: 'Dairy', minStock: 10 },
    { name: 'Lemon', unit: 'each', category: 'Produce', minStock: 30 },
    { name: 'Garlic', unit: 'lb', category: 'Produce', minStock: 3 },
    { name: 'Parsley', unit: 'bunch', category: 'Produce', minStock: 8 },
    { name: 'Old Bay Seasoning', unit: 'lb', category: 'Spices', minStock: 3 },
    { name: 'Tartar Sauce', unit: 'gal', category: 'Condiments', minStock: 2 },
    { name: 'Cocktail Sauce', unit: 'gal', category: 'Condiments', minStock: 2 },
    { name: 'Frying Oil', unit: 'gal', category: 'Oil & Fat', minStock: 5 },
  ],
  'Soul Food': [
    { name: 'Chicken (Whole)', unit: 'each', category: 'Protein', minStock: 15 },
    { name: 'Pork Chops', unit: 'lb', category: 'Protein', minStock: 15 },
    { name: 'Catfish Fillet', unit: 'lb', category: 'Protein', minStock: 10 },
    { name: 'Collard Greens', unit: 'bunch', category: 'Produce', minStock: 15 },
    { name: 'Sweet Potato', unit: 'lb', category: 'Produce', minStock: 15 },
    { name: 'Okra', unit: 'lb', category: 'Produce', minStock: 8 },
    { name: 'Cornmeal', unit: 'lb', category: 'Dry Goods', minStock: 15 },
    { name: 'All-Purpose Flour', unit: 'lb', category: 'Dry Goods', minStock: 15 },
    { name: 'Black-Eyed Peas', unit: 'lb', category: 'Dry Goods', minStock: 10 },
    { name: 'Rice', unit: 'lb', category: 'Dry Goods', minStock: 20 },
    { name: 'Butter', unit: 'lb', category: 'Dairy', minStock: 8 },
    { name: 'Buttermilk', unit: 'gal', category: 'Dairy', minStock: 3 },
    { name: 'Frying Oil', unit: 'gal', category: 'Oil & Fat', minStock: 8 },
    { name: 'Hot Sauce', unit: 'gal', category: 'Condiments', minStock: 2 },
    { name: 'Smoked Ham Hock', unit: 'lb', category: 'Protein', minStock: 5 },
  ],
  'Tex-Mex': [
    { name: 'Ground Beef', unit: 'lb', category: 'Protein', minStock: 20 },
    { name: 'Chicken Breast', unit: 'lb', category: 'Protein', minStock: 15 },
    { name: 'Flour Tortillas', unit: 'dozen', category: 'Bakery', minStock: 20 },
    { name: 'Corn Tortilla Chips', unit: 'lb', category: 'Dry Goods', minStock: 15 },
    { name: 'Cheddar Cheese', unit: 'lb', category: 'Dairy', minStock: 15 },
    { name: 'Queso', unit: 'lb', category: 'Dairy', minStock: 8 },
    { name: 'Sour Cream', unit: 'lb', category: 'Dairy', minStock: 5 },
    { name: 'Refried Beans', unit: 'can', category: 'Dry Goods', minStock: 20 },
    { name: 'Rice', unit: 'lb', category: 'Dry Goods', minStock: 20 },
    { name: 'Avocado', unit: 'each', category: 'Produce', minStock: 20 },
    { name: 'Jalapeno', unit: 'lb', category: 'Produce', minStock: 5 },
    { name: 'Onion', unit: 'lb', category: 'Produce', minStock: 10 },
    { name: 'Tomato', unit: 'lb', category: 'Produce', minStock: 10 },
    { name: 'Salsa', unit: 'gal', category: 'Condiments', minStock: 4 },
    { name: 'Cumin', unit: 'lb', category: 'Spices', minStock: 2 },
    { name: 'Chili Powder', unit: 'lb', category: 'Spices', minStock: 2 },
  ],
  'Thai': [
    { name: 'Jasmine Rice', unit: 'lb', category: 'Dry Goods', minStock: 30 },
    { name: 'Rice Noodles', unit: 'lb', category: 'Dry Goods', minStock: 15 },
    { name: 'Coconut Milk', unit: 'can', category: 'Dry Goods', minStock: 20 },
    { name: 'Fish Sauce', unit: 'bottle', category: 'Condiments', minStock: 4 },
    { name: 'Soy Sauce', unit: 'gal', category: 'Condiments', minStock: 2 },
    { name: 'Thai Curry Paste (Red)', unit: 'jar', category: 'Condiments', minStock: 5 },
    { name: 'Thai Curry Paste (Green)', unit: 'jar', category: 'Condiments', minStock: 5 },
    { name: 'Chicken Thigh', unit: 'lb', category: 'Protein', minStock: 15 },
    { name: 'Shrimp', unit: 'lb', category: 'Protein', minStock: 10 },
    { name: 'Tofu', unit: 'block', category: 'Protein', minStock: 8 },
    { name: 'Thai Basil', unit: 'bunch', category: 'Produce', minStock: 8 },
    { name: 'Lemongrass', unit: 'stalk', category: 'Produce', minStock: 10 },
    { name: 'Lime', unit: 'each', category: 'Produce', minStock: 20 },
    { name: 'Bean Sprouts', unit: 'lb', category: 'Produce', minStock: 5 },
    { name: 'Peanuts', unit: 'lb', category: 'Dry Goods', minStock: 5 },
  ],
  'Vietnamese': [
    { name: 'Jasmine Rice', unit: 'lb', category: 'Dry Goods', minStock: 30 },
    { name: 'Rice Noodles (Pho)', unit: 'lb', category: 'Dry Goods', minStock: 15 },
    { name: 'Rice Paper', unit: 'pack', category: 'Dry Goods', minStock: 10 },
    { name: 'Fish Sauce', unit: 'bottle', category: 'Condiments', minStock: 4 },
    { name: 'Hoisin Sauce', unit: 'bottle', category: 'Condiments', minStock: 3 },
    { name: 'Sriracha', unit: 'bottle', category: 'Condiments', minStock: 4 },
    { name: 'Beef Bone (Pho Broth)', unit: 'lb', category: 'Protein', minStock: 15 },
    { name: 'Beef Brisket', unit: 'lb', category: 'Protein', minStock: 10 },
    { name: 'Chicken Thigh', unit: 'lb', category: 'Protein', minStock: 10 },
    { name: 'Pork', unit: 'lb', category: 'Protein', minStock: 10 },
    { name: 'Bean Sprouts', unit: 'lb', category: 'Produce', minStock: 8 },
    { name: 'Thai Basil', unit: 'bunch', category: 'Produce', minStock: 8 },
    { name: 'Cilantro', unit: 'bunch', category: 'Produce', minStock: 10 },
    { name: 'Lime', unit: 'each', category: 'Produce', minStock: 20 },
    { name: 'Jalapeno', unit: 'lb', category: 'Produce', minStock: 3 },
    { name: 'Star Anise', unit: 'oz', category: 'Spices', minStock: 8 },
  ],
};

// --- Delivery Provider Config ---

export interface DeliveryProviderConfig {
  id: MarketplaceProviderType;
  name: string;
  icon: string;
  color: string;
  fields: { key: string; label: string; placeholder: string; type: string }[];
}

const DELIVERY_PROVIDERS: DeliveryProviderConfig[] = [
  {
    id: 'doordash_marketplace',
    name: 'DoorDash',
    icon: 'bi-truck',
    color: '#ff3008',
    fields: [
      { key: 'storeId', label: 'Store ID', placeholder: 'Your DoorDash Store ID', type: 'text' },
      { key: 'developerId', label: 'Developer ID', placeholder: 'Your DoorDash Developer ID', type: 'text' },
      { key: 'signingSecret', label: 'Signing Secret', placeholder: 'Your webhook signing secret', type: 'password' },
    ],
  },
  {
    id: 'ubereats',
    name: 'Uber Eats',
    icon: 'bi-bag',
    color: '#06c167',
    fields: [
      { key: 'storeId', label: 'Restaurant ID', placeholder: 'Your Uber Eats Restaurant ID', type: 'text' },
      { key: 'clientId', label: 'Client ID', placeholder: 'Your Uber Eats Client ID', type: 'text' },
      { key: 'clientSecret', label: 'Client Secret', placeholder: 'Your client secret', type: 'password' },
    ],
  },
  {
    id: 'grubhub',
    name: 'Grubhub',
    icon: 'bi-basket',
    color: '#f63440',
    fields: [
      { key: 'merchantId', label: 'Restaurant ID', placeholder: 'Your Grubhub Restaurant ID', type: 'text' },
      { key: 'apiKey', label: 'API Key', placeholder: 'Your Grubhub API Key', type: 'password' },
    ],
  },
];

// --- Hardware Recommendations ---

export interface HardwareRecommendation {
  id: string;
  category: string;
  icon: string;
  name: string;
  description: string;
  reason: string;
  price: string;
  imageUrl: string;
  buyUrl: string;
  buyLabel: string;
  essential: boolean;
  modes: DevicePosMode[];
  processorOnly?: PaymentProcessor;
}

const ALL_HARDWARE: HardwareRecommendation[] = [
  {
    id: 'tablet',
    category: 'POS Terminal',
    icon: 'bi-tablet',
    name: 'iPad 10th Gen (10.9", 64GB, Wi-Fi)',
    description: 'Your primary countertop POS. Large touchscreen, all-day battery, runs OrderStack as a web app or PWA.',
    reason: 'The gold standard for POS terminals. Fast, reliable, long battery life, and your staff already knows how to use it.',
    price: '$349',
    imageUrl: '/assets/hardware/tablet.webp',
    buyUrl: 'https://www.apple.com/shop/buy-ipad/ipad',
    buyLabel: 'apple.com',
    essential: true,
    modes: ['full_service', 'quick_service', 'bar', 'retail', 'services', 'bookings', 'standard'],
  },
  {
    id: 'phone',
    category: 'Mobile POS',
    icon: 'bi-phone',
    name: 'iPhone SE (3rd Gen)',
    description: 'Compact and affordable. For tableside ordering, line-busting, and mobile checkout anywhere in your business.',
    reason: 'Pocket-sized and affordable. Perfect for tableside ordering, line-busting, or mobile checkout anywhere in your business.',
    price: '$429',
    imageUrl: '/assets/hardware/phone.webp',
    buyUrl: 'https://www.apple.com/shop/buy-iphone/iphone-se',
    buyLabel: 'apple.com',
    essential: false,
    modes: ['full_service', 'bar', 'retail', 'services', 'bookings', 'standard'],
  },
  {
    id: 'card-reader-paypal',
    category: 'Card Reader',
    icon: 'bi-credit-card-2-front',
    name: 'PayPal Zettle Reader 2',
    description: 'Compact card reader. Accepts tap, chip, and contactless payments. Pairs with your PayPal account instantly.',
    reason: 'Affordable card reader at just $29. Accepts tap, chip, and contactless. Pairs with your PayPal account out of the box.',
    price: '$29',
    imageUrl: '/assets/hardware/card-reader-paypal.webp',
    buyUrl: 'https://www.zettle.com/us/card-reader',
    buyLabel: 'zettle.com',
    essential: true,
    modes: ['full_service', 'quick_service', 'bar', 'retail', 'services', 'bookings', 'standard'],
    processorOnly: 'paypal',
  },
  {
    id: 'kds',
    category: 'Order Display (KDS)',
    icon: 'bi-display',
    name: 'Samsung Galaxy Tab A9+ (11")',
    description: 'Budget-friendly Android tablet. Wall-mount it in the kitchen to display incoming orders and course timing.',
    reason: 'Large 11" screen at a budget-friendly price. Wall-mount it in the kitchen to display incoming orders and course timing in real time.',
    price: '$219',
    imageUrl: '/assets/hardware/kds.webp',
    buyUrl: 'https://www.samsung.com/us/tablets/galaxy-tab-a9-plus/',
    buyLabel: 'samsung.com',
    essential: false,
    modes: ['full_service', 'quick_service', 'bar'],
  },
  {
    id: 'kiosk',
    category: 'Self-Order Kiosk',
    icon: 'bi-person-badge',
    name: 'Heckler WindFall Stand for iPad',
    description: 'Secure kiosk enclosure designed specifically for iPad. Tamper-resistant, sleek design for customer self-ordering.',
    reason: 'Secure kiosk enclosure designed specifically for iPad. Tamper-resistant, sleek design. Customers can self-order without staff.',
    price: '$225',
    imageUrl: '/assets/hardware/kiosk.webp',
    buyUrl: 'https://www.amazon.com/s?k=Heckler+WindFall+Stand+iPad',
    buyLabel: 'Amazon',
    essential: false,
    modes: ['quick_service', 'retail'],
  },
  {
    id: 'barcode-scanner',
    category: 'Barcode Scanner',
    icon: 'bi-upc-scan',
    name: 'Socket Mobile S740',
    description: 'Bluetooth 2D barcode scanner. Pairs wirelessly with your tablet or phone for fast product scanning.',
    reason: 'Bluetooth 2D barcode scanner. Pairs wirelessly with your tablet or phone. Scans product barcodes instantly for fast retail checkout.',
    price: '$396',
    imageUrl: '/assets/hardware/barcode-scanner.webp',
    buyUrl: 'https://www.amazon.com/s?k=Socket+Mobile+SocketScan+S740',
    buyLabel: 'Amazon',
    essential: false,
    modes: ['retail'],
  },
  {
    id: 'receipt-printer',
    category: 'Receipt Printer',
    icon: 'bi-printer',
    name: 'Star Micronics mC-Print3',
    description: 'Thermal receipt printer. Connects via USB, Bluetooth, or Wi-Fi. Prints customer receipts and kitchen tickets.',
    reason: 'Industry standard thermal receipt printer. Connects via USB, Bluetooth, or Wi-Fi. Prints customer receipts and kitchen tickets automatically.',
    price: '$450',
    imageUrl: '/assets/hardware/receipt-printer.webp',
    buyUrl: 'https://www.amazon.com/s?k=Star+Micronics+mC-Print3',
    buyLabel: 'Amazon',
    essential: false,
    modes: ['full_service', 'quick_service', 'bar', 'retail'],
  },
  {
    id: 'cash-drawer',
    category: 'Cash Drawer',
    icon: 'bi-safe',
    name: 'APG Vasario 1616',
    description: 'Auto-opens when connected to your receipt printer. Multiple bill and coin slots for organized cash handling.',
    reason: 'Auto-opens when connected to your receipt printer on cash sales. Multiple bill and coin slots. Reliable and affordable at $89.',
    price: '$89',
    imageUrl: '/assets/hardware/cash-drawer.webp',
    buyUrl: 'https://www.amazon.com/s?k=APG+Vasario+1616+cash+drawer',
    buyLabel: 'Amazon',
    essential: false,
    modes: ['full_service', 'quick_service', 'bar', 'retail'],
  },
];

@Component({
  selector: 'os-setup-wizard',
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule],
  templateUrl: './setup-wizard.html',
  styleUrl: './setup-wizard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SetupWizard implements OnInit {
  private readonly platformService = inject(PlatformService);
  private readonly authService = inject(AuthService);
  private readonly deviceService = inject(DeviceService);
  private readonly menuService = inject(MenuService);
  readonly pwaInstall = inject(PwaInstallService);
  readonly paymentConnect = inject(PaymentConnectService);
  private readonly inventoryService = inject(InventoryService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);

  readonly usStates = US_STATES;
  readonly revenueRanges = REVENUE_RANGES;
  readonly cuisines = CUISINES;
  readonly deliveryProviders = DELIVERY_PROVIDERS;

  // --- MFA Setup (Step 1) ---
  private readonly _mfaMaskedEmail = signal<string | null>(null);
  readonly mfaMaskedEmail = this._mfaMaskedEmail.asReadonly();

  private readonly _mfaLoading = signal(false);
  readonly mfaLoading = this._mfaLoading.asReadonly();

  private readonly _mfaError = signal<string | null>(null);
  readonly mfaError = this._mfaError.asReadonly();

  private readonly _mfaCodeSent = signal(false);
  readonly mfaCodeSent = this._mfaCodeSent.asReadonly();

  mfaCodeForm: FormGroup = this.fb.group({
    code: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]],
  });

  // --- Step map ---
  // Step 1: MFA setup. Step 2: Mode selection → dashboard.
  readonly totalSteps = computed(() => 2);

  // --- Wizard navigation ---
  readonly _currentStep = signal(1);
  readonly currentStep = this._currentStep.asReadonly();

  private readonly _initializing = signal(true);
  readonly initializing = this._initializing.asReadonly();

  readonly progressPercent = computed(() =>
    Math.round((this._currentStep() / this.totalSteps()) * 100)
  );

  // --- Step 1: Business Name + Addresses ---
  readonly _businessName = signal('');

  // Home address (billing/legal)
  readonly _homeStreet = signal('');
  readonly _homeStreet2 = signal('');
  readonly _homeCity = signal('');
  readonly _homeState = signal('');
  readonly _homeZip = signal('');

  // Business address
  readonly _bizNoPhysical = signal(false);
  readonly _bizStreet = signal('');
  readonly _bizStreet2 = signal('');
  readonly _bizCity = signal('');
  readonly _bizState = signal('');
  readonly _bizZip = signal('');

  // --- Step 1: Mode Selection (4-card grid) ---
  private readonly _selectedPosMode = signal<DevicePosMode | null>(null);
  readonly selectedPosMode = this._selectedPosMode.asReadonly();

  readonly MODE_CARDS = [
    { mode: 'quick_service' as DevicePosMode, label: 'Quick Service', subtext: 'Counter, takeout, food truck', icon: 'bi-lightning-charge' },
    { mode: 'full_service' as DevicePosMode, label: 'Full Service', subtext: 'Sit-down, table management', icon: 'bi-shop' },
    { mode: 'bar' as DevicePosMode, label: 'Bar & Brewery', subtext: 'Tabs, drinks, nightlife', icon: 'bi-cup-straw' },
    { mode: 'catering' as DevicePosMode, label: 'Catering', subtext: 'Events, proposals, milestone payments', icon: 'bi-truck' },
  ];

  // Legacy: kept for onboarding payload compatibility
  readonly _selectedBusinessType = signal<BusinessCategory | null>(null);

  readonly isMfaStep = computed(() => this._currentStep() === 1);
  readonly isModeStep = computed(() => this._currentStep() === 2);

  // Derive vertical from business type selection
  readonly effectivePrimaryVertical = computed<BusinessVertical>(() => {
    const bt = this._selectedBusinessType();
    return bt?.vertical ?? 'food_and_drink';
  });

  readonly selectedVerticals = computed<BusinessVertical[]>(() => {
    return [this.effectivePrimaryVertical()];
  });

  readonly isFoodBusiness = computed(() =>
    this.effectivePrimaryVertical() === 'food_and_drink'
  );

  // --- Cuisine (food_and_drink only) ---
  readonly _selectedCuisine = signal<string | null>(null);
  readonly _cuisineSearch = signal('');

  readonly filteredCuisines = computed(() => {
    const search = this._cuisineSearch().toLowerCase().trim();
    if (!search) return CUISINES;
    return CUISINES.filter(c => c.toLowerCase().includes(search));
  });

  readonly _selectedMenuTemplateId = signal<string | null>(null);

  // --- Annual Revenue ---
  readonly _selectedRevenue = signal<string | null>(null);

  // --- Multiple Locations (Step 5) ---
  readonly _hasMultipleLocations = signal(false);
  readonly _locationCount = signal(2);

  // --- Delivery Providers (Step 6, food_and_drink only) ---
  readonly _enabledProviders = signal<Set<MarketplaceProviderType>>(new Set());
  readonly _providerCredentials = signal<Record<string, Record<string, string>>>({});

  // --- Processor ---
  readonly _selectedProcessor = signal<PaymentProcessor>('paypal');

  readonly isProcessorConnected = computed(() => {
    return this.paymentConnect.paypalStatus() === 'connected';
  });

  // --- Hardware Recommendations ---
  readonly recommendedHardware = computed<HardwareRecommendation[]>(() => {
    const mode = this.autoDetectedMode();
    const processor = this._selectedProcessor();
    return ALL_HARDWARE.filter(hw => {
      if (!hw.modes.includes(mode)) return false;
      // Processor-aware card reader filtering
      if (hw.processorOnly && hw.processorOnly !== processor) return false;
      return true;
    });
  });

  readonly essentialHardware = computed(() =>
    this.recommendedHardware().filter(hw => hw.essential)
  );

  readonly optionalHardware = computed(() =>
    this.recommendedHardware().filter(hw => !hw.essential)
  );

  // --- Auto-detect mode from business type ---
  readonly autoDetectedMode = computed<DevicePosMode>(() => {
    return this._selectedPosMode() ?? 'full_service';
  });

  readonly autoDetectedModeLabel = computed(() => {
    const mode = this.autoDetectedMode();
    return DEVICE_POS_MODE_CATALOG.find(c => c.mode === mode)?.label ?? mode;
  });

  // --- Step identity computeds ---
  // First-run: 1=address, 2=biztype, 3=done
  // Legacy step helpers kept so hidden step code still compiles.

  readonly isCuisineStep = computed(() => false);
  readonly isRevenueStep = computed(() => false);
  readonly isLocationsStep = computed(() => false);
  readonly isDeliveryStep = computed(() => false);
  readonly isPlanStep = computed(() => false);
  readonly isHardwareStep = computed(() => false);

  readonly isDoneStep = computed(() =>
    this._currentStep() === this.totalSteps()
  );

  readonly stepLabel = computed(() => 'All Set');

  // --- Submission ---
  readonly _isSubmitting = signal(false);
  readonly _submitError = signal<string | null>(null);
  readonly _submitSuccess = signal(false);
  readonly _onboardingDone = signal(false);

  readonly isLoading = this.platformService.isLoading;

  // --- Address validation helpers ---

  private isValidStreet(street: string): boolean {
    const s = street.trim();
    // Must be at least 5 chars, contain at least one digit and one letter
    return s.length >= 5 && /\d/.exec(s) !== null && /[a-zA-Z]/.exec(s) !== null;
  }

  private isValidZip(zip: string): boolean {
    return ZIP_REGEX.exec(zip.trim()) !== null;
  }

  private isHomeAddressValid(): boolean {
    return this.isValidStreet(this._homeStreet())
      && this._homeCity().trim().length > 0
      && this._homeState().trim().length > 0
      && this.isValidZip(this._homeZip());
  }

  private isBizAddressValid(): boolean {
    if (this._bizNoPhysical()) return true;
    return this.isValidStreet(this._bizStreet())
      && this._bizCity().trim().length > 0
      && this._bizState().trim().length > 0
      && this.isValidZip(this._bizZip());
  }

  // --- Step validation ---
  readonly canProceed = computed(() => {
    if (this.isDoneStep()) return !this._isSubmitting();
    if (this.isModeStep()) return this._selectedPosMode() !== null;
    if (this.isMfaStep()) return false; // MFA step uses its own action buttons
    return false;
  });

  // --- Popstate listener for browser back ---
  private readonly popstateHandler = (event: PopStateEvent): void => {
    const step = this._currentStep();
    if (step > 1) {
      event.preventDefault();
      this._currentStep.set(step - 1);
      history.pushState({ step: step - 1 }, '');
    }
  };

  async ngOnInit(): Promise<void> {
    // Load merchant profile to resume wizard from saved progress
    await this.platformService.loadMerchantProfile();
    const profile = this.platformService.merchantProfile();
    if (profile) {
      const p = profile as unknown as Record<string, unknown>;
      // Only skip step 1 if wizardStep was explicitly saved (user completed step 1)
      const savedStep = p['wizardStep'];
      if (typeof savedStep === 'number' && savedStep > 1) {
        this._currentStep.set(savedStep);
        const savedMode = p['defaultDeviceMode'] as DevicePosMode | undefined;
        if (savedMode) {
          this._selectedPosMode.set(savedMode);
        }
      }
    }

    history.pushState({ step: this._currentStep() }, '');
    globalThis.addEventListener('popstate', this.popstateHandler);
    this.destroyRef.onDestroy(() => {
      globalThis.removeEventListener('popstate', this.popstateHandler);
    });

    // Skip MFA step if device was verified at signup (email OTP counts as device verification)
    if (this._currentStep() === 1 && this.authService.deviceMfaValid()) {
      this._initializing.set(false);
      await this.next();
      return;
    }

    this._initializing.set(false);

    // Auto-send MFA OTP when landing on step 1
    if (this._currentStep() === 1) {
      await this.sendSetupOtp();
    }
  }

  // --- MFA Step methods ---

  private async sendSetupOtp(): Promise<void> {
    this._mfaLoading.set(true);
    this._mfaError.set(null);
    try {
      const data = await this.authService.setupMfa();
      this._mfaMaskedEmail.set(data.maskedEmail);
      this._mfaCodeSent.set(true);
    } catch {
      // MFA already enabled (e.g., returning user) — skip step 1
      this._mfaCodeSent.set(false);
      await this.next();
    } finally {
      this._mfaLoading.set(false);
    }
  }

  async resendSetupOtp(): Promise<void> {
    this.mfaCodeForm.reset();
    this._mfaError.set(null);
    await this.sendSetupOtp();
  }

  async submitMfaCode(): Promise<void> {
    if (this.mfaCodeForm.invalid) {
      this.mfaCodeForm.markAllAsTouched();
      return;
    }

    this._mfaLoading.set(true);
    this._mfaError.set(null);

    const code = (this.mfaCodeForm.value.code as string).trim();
    const result = await this.authService.verifyMfaCode(code);

    this._mfaLoading.set(false);

    if (result.success) {
      await this.next();
    } else {
      this._mfaError.set(result.error ?? 'Invalid code. Please try again.');
    }
  }

  async skipMfaSetup(): Promise<void> {
    await this.next();
  }

  // --- Navigation ---

  async next(): Promise<void> {
    const current = this._currentStep();
    const total = this.totalSteps();

    if (current < total) {
      const nextStep = current + 1;
      this._currentStep.set(nextStep);
      history.pushState({ step: nextStep }, '');
      // Save progress + selected mode to database
      const progress: Record<string, unknown> = { wizardStep: nextStep };
      const mode = this._selectedPosMode();
      if (mode) {
        progress['defaultDeviceMode'] = mode;
      }
      this.platformService.saveWizardProgress(progress);
    }
  }

  prev(): void {
    const current = this._currentStep();
    if (current > 1) {
      this._currentStep.set(current - 1);
      history.pushState({ step: current - 1 }, '');
      this.platformService.saveWizardProgress({ wizardStep: current - 1 });
    }
  }

  // --- Step 1: Address helpers ---

  toggleNoPhysical(): void {
    this._bizNoPhysical.update(v => !v);
  }

  // --- Step 1: Mode Selection ---

  selectMode(mode: DevicePosMode): void {
    this._selectedPosMode.set(mode);
    const categoryMap: Partial<Record<DevicePosMode, string>> = {
      quick_service: 'Fast Food Restaurant',
      full_service: 'Full Service Restaurant',
      bar: 'Bar',
      catering: 'Caterer',
    };
    const catName = categoryMap[mode];
    if (catName) {
      const cat = BUSINESS_CATEGORIES.find(c => c.name === catName);
      if (cat) this._selectedBusinessType.set(cat);
    }
  }

  async selectModeAndGo(mode: DevicePosMode): Promise<void> {
    this.selectMode(mode);
    await this.goToDashboard();
  }

  // --- Cuisine ---

  selectCuisine(cuisine: string): void {
    this._selectedCuisine.set(cuisine);
    const template = CUISINE_TEMPLATE_MAP[cuisine] ?? DEFAULT_MENU_TEMPLATE;
    this._selectedMenuTemplateId.set(template);
  }

  // --- Revenue selection ---

  selectRevenue(id: string): void {
    this._selectedRevenue.set(id);
  }

  // --- Locations ---

  selectSingleLocation(): void {
    this._hasMultipleLocations.set(false);
    this._locationCount.set(1);
  }

  selectMultipleLocations(): void {
    this._hasMultipleLocations.set(true);
    if (this._locationCount() < 2) {
      this._locationCount.set(2);
    }
  }

  // --- Delivery Providers ---

  toggleProvider(providerId: MarketplaceProviderType): void {
    this._enabledProviders.update(set => {
      const next = new Set(set);
      if (next.has(providerId)) {
        next.delete(providerId);
      } else {
        next.add(providerId);
      }
      return next;
    });
  }

  isProviderEnabled(providerId: MarketplaceProviderType): boolean {
    return this._enabledProviders().has(providerId);
  }

  setProviderCredential(providerId: string, fieldKey: string, value: string): void {
    this._providerCredentials.update(creds => {
      const existing = creds[providerId] ?? Object.create(null) as Record<string, string>;
      const providerCreds = { ...existing, [fieldKey]: value };
      return { ...creds, [providerId]: providerCreds };
    });
  }

  getProviderCredential(providerId: string, fieldKey: string): string {
    return this._providerCredentials()[providerId]?.[fieldKey] ?? '';
  }

  // --- Processor ---

  selectProcessor(processor: PaymentProcessor): void {
    this._selectedProcessor.set(processor);
  }

  async connectProcessor(): Promise<void> {
    {
      const url = await this.paymentConnect.startPayPalConnect();
      if (url) {
        window.open(url, '_blank');
        await this.paymentConnect.pollPayPalUntilConnected();
      }
    }
  }

  // --- Onboarding submission ---

  private async submitOnboarding(): Promise<void> {
    this._isSubmitting.set(true);
    this._submitError.set(null);

    const detectedMode = this.autoDetectedMode();
    const bizAddress = this.buildBusinessAddress();
    const payload = this.buildOnboardingPayload(detectedMode, bizAddress);

    // Restaurant already exists from signup — complete onboarding on it
    const restaurantId = this.authService.selectedMerchantId();
    if (!restaurantId) {
      this._isSubmitting.set(false);
      this._submitError.set('No restaurant selected. Please sign in again.');
      return;
    }

    const result = await this.platformService.completeOnboarding(restaurantId, payload);
    this._isSubmitting.set(false);

    if (result) {
      await this.handleOnboardingSuccess(result, payload, detectedMode);
    } else {
      this._submitError.set(this.platformService.error() ?? 'Something went wrong');
    }
  }

  private buildBusinessAddress(): BusinessAddress {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (this._bizNoPhysical()) {
      return { street: '', street2: null, city: '', state: '', zip: '', country: 'US', timezone: tz, phone: null, lat: null, lng: null };
    }
    return {
      street: this._bizStreet(),
      street2: this._bizStreet2() || null,
      city: this._bizCity(),
      state: this._bizState(),
      zip: this._bizZip(),
      country: 'US',
      timezone: tz,
      phone: null,
      lat: null,
      lng: null,
    };
  }

  private buildOnboardingPayload(detectedMode: DevicePosMode, bizAddress: BusinessAddress): OnboardingPayload {
    const user = this.authService.user();
    return {
      businessName: this._businessName(),
      address: bizAddress,
      verticals: this.selectedVerticals(),
      primaryVertical: this.effectivePrimaryVertical(),
      complexity: 'full',
      defaultDeviceMode: detectedMode,
      taxLocale: defaultTaxLocaleConfig(),
      businessHours: defaultBusinessHours(),
      paymentProcessor: this.isProcessorConnected() ? this._selectedProcessor() : 'none',
      menuTemplateId: this._selectedMenuTemplateId(),
      businessCategory: this._selectedBusinessType()?.name ?? null,
      ownerPin: {
        displayName: user ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || 'Owner' : 'Owner',
        pin: '',
        role: 'owner',
      },
    };
  }

  private async handleOnboardingSuccess(result: OnboardingResult, payload: OnboardingPayload, detectedMode: DevicePosMode): Promise<void> {
    if (!result.restaurantId) {
      console.error('[SetupWizard] completeOnboarding returned no restaurantId. Full result:', result);
      this._submitError.set('Onboarding completed but restaurant ID was not returned. Please refresh and try again.');
      this._isSubmitting.set(false);
      return;
    }

    this.authService.selectMerchant(result.restaurantId, result.name ?? payload.businessName, undefined, undefined, true);
    this.authService.markOnboardingComplete(result.restaurantId);
    this.platformService.persistCurrentProfile();
    this._onboardingDone.set(true);

    const device = await this.deviceService.registerBrowserDevice(detectedMode);
    if (device) {
      this.platformService.setDeviceModeFromDevice(detectedMode);
    }

    await this.seedFoodAndDrinkDefaults();
  }

  private async seedFoodAndDrinkDefaults(): Promise<void> {
    if (this.effectivePrimaryVertical() !== 'food_and_drink') return;

    await this.menuService.createMenuSchedule({
      name: 'Default Schedule',
      isDefault: true,
      dayparts: [
        { name: 'Breakfast', startTime: '06:00', endTime: '11:00', daysOfWeek: [0, 1, 2, 3, 4, 5, 6], isActive: true, displayOrder: 0 },
        { name: 'Lunch', startTime: '11:00', endTime: '16:00', daysOfWeek: [0, 1, 2, 3, 4, 5, 6], isActive: true, displayOrder: 1 },
        { name: 'Dinner', startTime: '16:00', endTime: '23:00', daysOfWeek: [0, 1, 2, 3, 4, 5, 6], isActive: true, displayOrder: 2 },
      ],
    });

    const cuisine = this._selectedCuisine();
    if (cuisine) {
      const templates = CUISINE_INVENTORY_MAP[cuisine] ?? [];
      for (const tmpl of templates) {
        await this.inventoryService.createItem({
          name: tmpl.name,
          unit: tmpl.unit,
          category: tmpl.category,
          currentStock: 0,
          minStock: tmpl.minStock,
          maxStock: tmpl.minStock * 3,
          costPerUnit: 0,
          supplier: null,
        });
      }
    }
  }

  // --- Done screen ---

  async goToDashboard(): Promise<void> {
    const merchantId = this.authService.selectedMerchantId();
    if (merchantId) {
      this.authService.markOnboardingComplete(merchantId);
      const mode = this._selectedPosMode();
      const cat = this._selectedBusinessType();
      await this.platformService.saveWizardProgress({
        onboardingComplete: true,
        defaultDeviceMode: mode ?? 'full_service',
        businessCategory: cat?.name ?? null,
        wizardStep: 2,
      });
    }
    this.router.navigate([this.authService.getPostAuthRoute()]);
  }

  async installApp(): Promise<void> {
    await this.pwaInstall.promptInstall();
  }
}
