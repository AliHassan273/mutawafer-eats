import { Restaurant } from './types';

export const CATEGORIES = [
  { id: 'all', name: 'All Eats', icon: '🍽️' },
  { id: 'burgers', name: 'Burgers', icon: '🍔' },
  { id: 'pizza', name: 'Pizza', icon: '🍕' },
  { id: 'salads', name: 'Salads', icon: '🥗' },
  { id: 'sushi', name: 'Sushi', icon: '🍣' },
  { id: 'ramen', name: 'Ramen', icon: '🍜' },
  { id: 'dessert', name: 'Dessert', icon: '🍦' },
  { id: 'drinks', name: 'Drinks', icon: '🥤' },
  { id: 'sides', name: 'Sides', icon: '🍟' },
  { id: 'offers', name: 'Special Offers', icon: '🏷️' }
];

export const RESTAURANTS: Restaurant[] = [
  {
    id: 'rest_1',
    name: 'Big Bun Burger Bar',
    rating: 4.8,
    distance: 1.2,
    deliveryTime: '15-25 min',
    deliveryFee: 0,
    promo: 'FREE DELIVERY',
    coverImage: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1000&q=80',
    categories: ['burgers'],
    descriptionString: 'Voted #1 Best Burger Joint in Town! Juicy Flame-grilled Premium Beef, Signature Sauces, and Fresh Golden Crispy Fries.',
    menu: [
      {
        id: 'item_1_1',
        name: 'The Original Big Bun',
        description: 'Double flame-grilled Angus beef patty, cheddar cheese, crispy lettuce, ripe tomatoes, onion, and our secret Big Bun house sauce.',
        price: 11.99,
        image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80',
        category: 'Popular'
      },
      {
        id: 'item_1_2',
        name: 'Smokey Bacon & Cheese',
        description: 'Single Angus patty, triple hardwood-smoked bacon, melted Swiss cheese, caramelized onions, and master Hickory BBQ syrup.',
        price: 13.49,
        image: 'https://images.unsplash.com/photo-1553979459-d2229ba7433b?auto=format&fit=crop&w=600&q=80',
        category: 'Popular'
      },
      {
        id: 'item_1_3',
        name: 'Chili Lava Fire Burger',
        description: 'For spice lovers. Premium beef patty, ghost pepper cheese, jalapeños, spicy mayo, and fiery house chili-paste.',
        price: 12.99,
        image: 'https://images.unsplash.com/photo-1594212699903-ec8a3cee50f6?auto=format&fit=crop&w=600&q=80',
        category: 'Burgers'
      },
      {
        id: 'item_1_4',
        name: 'Truffle Mushroom Burger',
        description: 'Juicy beef, swiss cheese, sautéed cremini mushrooms, truffle butter, and rich roasted garlic aioli in brioche bun.',
        price: 14.99,
        image: 'https://images.unsplash.com/photo-1525059696034-4967a8e1dca2?auto=format&fit=crop&w=600&q=80',
        category: 'Burgers'
      },
      {
        id: 'item_1_5',
        name: 'Crunchy Cheesy Sweet Potato Fries',
        description: 'Crisp hand-cut sweet potato fries dusted with sea salt and served with maple marshmallow cream sauce.',
        price: 5.49,
        image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=600&q=80',
        category: 'Sides'
      },
      {
        id: 'item_1_6',
        name: 'Avocado Garden Crunch',
        description: 'Crispy premium fried chicken breast, sliced hass avocado, ranch dressing, and crisp butterhead lettuce.',
        price: 11.49,
        image: 'https://images.unsplash.com/photo-1513185158878-8d8c2a2a3ad3?auto=format&fit=crop&w=600&q=80',
        category: 'Burgers'
      },
      {
        id: 'item_1_7',
        name: 'Craft Oreo Vanilla Milkshake',
        description: 'Whipped vanilla ice cream blended with authentic Oreo cookie crumbles and capped with sweet whipped cream.',
        price: 4.99,
        image: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=600&q=80',
        category: 'Drinks'
      }
    ]
  },
  {
    id: 'rest_2',
    name: 'Mamma Mia Pizza',
    rating: 4.5,
    distance: 2.4,
    deliveryTime: '20-30 min',
    deliveryFee: 1.99,
    coverImage: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1000&q=80',
    categories: ['pizza'],
    descriptionString: 'Authentic stoneground Wood-fired Neapolitan Pizzas. Made with 48-hour fermented sourdough, imported San Marzano tomatoes, and fresh buffalo mozzarella.',
    menu: [
      {
        id: 'item_2_1',
        name: 'Sourdough Margherita',
        description: 'Our traditional recipe. San Marzano tomato base, fresh buffalo mozzarella slices, basil leaves, & premium extra virgin olive oil drizzle.',
        price: 13.99,
        image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=600&q=80',
        category: 'Popular'
      },
      {
        id: 'item_2_2',
        name: 'Double Pepperoni Dynamite',
        description: 'Spicy pepperonis, smoked cup-and-char pepperoni, mozzarella cheese, chili-infused honey, and zesty pomodoro base.',
        price: 15.99,
        image: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=600&q=80',
        category: 'Popular'
      },
      {
        id: 'item_2_3',
        name: 'Truffle Porcini White Pizza',
        description: 'Elegant white base. Rich wild porcini mushrooms, creamy fontina cheese, fresh rosemary, sea salt, and highly fragrant truffle oil.',
        price: 17.49,
        image: 'https://images.unsplash.com/photo-1576458088443-04a19bb13da6?auto=format&fit=crop&w=600&q=80',
        category: 'Pizza'
      },
      {
        id: 'item_2_4',
        name: 'Mediterranean Feast Veggie',
        description: 'House pesto base, grilled aubergines, sun-dried tomatoes, artichoke hearts, kalamata olives, and crumbled organic goat cheese.',
        price: 14.99,
        image: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=600&q=80',
        category: 'Pizza'
      },
      {
        id: 'item_2_5',
        name: 'Signature Garlic Dough Knots',
        description: 'Fresh baked garlic-butter sourdough dough knots dusted with parmesan and served with tomato marinara dipping cup.',
        price: 6.29,
        image: 'https://images.unsplash.com/photo-1544982503-9f984c14501a?auto=format&fit=crop&w=600&q=80',
        category: 'Sides'
      },
      {
        id: 'item_2_6',
        name: 'Sparkling Lemon & Mint Soda',
        description: 'Naturally fermented Italian soda with fresh squeezed Sicilian lemons and crushed green garden mint.',
        price: 3.49,
        image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=600&q=80',
        category: 'Drinks'
      }
    ]
  },
  {
    id: 'rest_3',
    name: 'Green Leaf Salads',
    rating: 4.9,
    distance: 0.8,
    deliveryTime: '10-20 min',
    deliveryFee: 0,
    promo: 'PROMO AVAILABLE',
    coverImage: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1000&q=80',
    categories: ['salads'],
    descriptionString: 'Superfood Salads & Organic Nourish Bowls made with farm-to-table organic inputs, healthy cold-pressed dressings, and clean grains.',
    menu: [
      {
        id: 'item_3_1',
        name: 'Avocado Buddha Glow Bowl',
        description: 'Organic warm quinoa, sliced hass avocados, roasted sweet potatoes, organic leafy kale, pickled crimson beets, tahini dressing.',
        price: 12.49,
        image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=600&q=80',
        category: 'Popular'
      },
      {
        id: 'item_3_2',
        name: 'Crispy Sesame Ginger Tofu Salad',
        description: 'Puffed crispy organic tofu cuboids, carrot spirals, red cabbage ribbons, shelled edamame, and sesame-ginger wild emulsion.',
        price: 11.99,
        image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80',
        category: 'Popular'
      },
      {
        id: 'item_3_3',
        name: 'Wild Salmon Quinoa Harvest',
        description: 'Pan-seared Atlantic wild caught salmon, toasted almonds, sweet dynamic apple wedges, power spinach, maple cider mustard vinaigrette.',
        price: 15.99,
        image: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=600&q=80',
        category: 'Bowls'
      },
      {
        id: 'item_3_4',
        name: 'Warm Roasted Veggie Medley',
        description: 'Oven-roasted butternut squash, purple broccolini, cauliflower florets, pumpkin seeds, and a touch of organic balsamic glaze.',
        price: 9.99,
        image: 'https://images.unsplash.com/photo-1624462966581-bc6d768cbce5?auto=format&fit=crop&w=600&q=80',
        category: 'Bowls'
      },
      {
        id: 'item_3_5',
        name: 'Antioxidant Super-Berry Smoothie',
        description: 'Antioxidant packed blend of cold-pressed wild blueberries, sweet strawberries, raspberries, and cold organic coconut water.',
        price: 5.99,
        image: 'https://images.unsplash.com/photo-1553530666-ba11a7da3888?auto=format&fit=crop&w=600&q=80',
        category: 'Drinks'
      }
    ]
  },
  {
    id: 'rest_4',
    name: 'Sakura Sushi House',
    rating: 4.7,
    distance: 3.1,
    deliveryTime: '25-35 min',
    deliveryFee: 2.99,
    coverImage: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=1000&q=80',
    categories: ['sushi'],
    descriptionString: 'Fine Japanese Dining. Premium grade yellowtail, fatty tuna, toasted eel, and expert sushi master rolls created freshly.',
    menu: [
      {
        id: 'item_4_1',
        name: 'Dragon Roll Deluxe',
        description: 'Crispy shrimp tempura, cucumber inside, layered avocado and premium eel on the outside, brushed with sweet glaze and spicy unagi sauce.',
        price: 16.99,
        image: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=600&q=80',
        category: 'Popular'
      },
      {
        id: 'item_4_2',
        name: 'Premium Nigiri Tasting',
        description: '6 pieces of hand-pressed artisan sushi with chef select premium toppings: bluefin tuna, Atlantic salmon, yellowtail, octopus, sweet shrimp, and unagi.',
        price: 21.99,
        image: 'https://images.unsplash.com/photo-1611143669185-af224c5e3252?auto=format&fit=crop&w=600&q=80',
        category: 'Popular'
      },
      {
        id: 'item_4_3',
        name: 'Spicy Volcano Tuna Roll',
        description: 'Ocean-caught spicy minced tuna, green chives, sriracha oil, topped with creamy hot dynamic seafood dynamic bake.',
        price: 13.99,
        image: 'https://images.unsplash.com/photo-1553621042-f6e147245754?auto=format&fit=crop&w=600&q=80',
        category: 'Rolls'
      },
      {
        id: 'item_4_4',
        name: 'Fresh Edamame with Sea Salt',
        description: 'Steamed green edamame pods tossed with mineral-rich Maldons sea salt flakes.',
        price: 4.49,
        image: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&w=600&q=80',
        category: 'Sides'
      }
    ]
  },
  {
    id: 'rest_5',
    name: 'Dragon Ramen Lounge',
    rating: 4.6,
    distance: 1.8,
    deliveryTime: '18-28 min',
    deliveryFee: 1.49,
    promo: 'PROMO AVAILABLE',
    coverImage: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=1000&q=80',
    categories: ['ramen'],
    descriptionString: 'Our high broth standard: 18-hours slow-simmered rich pork tonkotsu broth. Home-pulled wheat alkaline noodles served steaming hot with tender chashu.',
    menu: [
      {
        id: 'item_5_1',
        name: 'Truffle Tonkotsu Ramen',
        description: 'Our jewel. Rich, creamy pork bone broth, tender chashu pork belly, marinated gooey soft ajitama egg, wood-ear mushrooms, bamboo shoots, and black truffle paste.',
        price: 15.49,
        image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=600&q=80',
        category: 'Popular'
      },
      {
        id: 'item_5_2',
        name: 'Fiery Black Garlic Black Belt',
        description: 'Spicy sesame miso blend broth, tender slow-cooked pulled beef rib, toasted chili oil, dark black garlic oil, fresh scallions, nori.',
        price: 14.99,
        image: 'https://images.unsplash.com/photo-1557872943-16a5ac26437e?auto=format&fit=crop&w=600&q=80',
        category: 'Popular'
      },
      {
        id: 'item_5_3',
        name: 'Steamed Pan-Fried Pork Gyoza',
        description: '5 pieces of delicious crispy pan-fried delicate pork and cabbage dumplings with soy ginger vinegary dip.',
        price: 6.99,
        image: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=600&q=80',
        category: 'Sides'
      },
      {
        id: 'item_5_4',
        name: 'Cold Jasmine Green Brew',
        description: 'Organically sourced sweet loose-leaf green tea cold-brewed overnight for a floral, crisp refreshment.',
        price: 2.99,
        image: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=600&q=80',
        category: 'Drinks'
      }
    ]
  },
  {
    id: 'rest_6',
    name: 'Sweet Delight Desserts',
    rating: 4.9,
    distance: 1.0,
    deliveryTime: '10-20 min',
    deliveryFee: 0,
    promo: 'FREE DELIVERY',
    coverImage: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=1000&q=80',
    categories: ['dessert'],
    descriptionString: 'Artisanal sweet shop offering handcrafted gourmet donuts, waffle stacks, decadent warm molten cakes, and house-churned organic vanilla bean gelatos.',
    menu: [
      {
        id: 'item_6_1',
        name: 'Ultimate Chocolate Molten Cup',
        description: 'Rich dark Belgian chocolate soufflé cake with a warm flowing fudge lava heart, escorted by a scoop of french Madagascar vanilla gelato.',
        price: 7.99,
        image: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&w=600&q=80',
        category: 'Popular'
      },
      {
        id: 'item_6_2',
        name: 'Strawberries & Cream Waffle Tower',
        description: 'Crispy warm golden Belgian waffle stack piled with organic fresh strawberries, sweet maple vanilla cream, and dark chocolate drizzles.',
        price: 8.49,
        image: 'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?auto=format&fit=crop&w=600&q=80',
        category: 'Popular'
      },
      {
        id: 'item_6_3',
        name: 'Matcha Crème Brûlée',
        description: 'Delicate creamy baked custard infused with Japanese matcha green tea power, and a super glass-shattering torched brown sugar crust.',
        price: 6.49,
        image: 'https://images.unsplash.com/photo-1470324161839-ce2bb6fa6bc3?auto=format&fit=crop&w=600&q=80',
        category: 'Desserts'
      }
    ]
  }
];
