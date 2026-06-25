import { Restaurant } from './types';

export const CATEGORIES = [
  { id: 'all', name: 'All Eats', icon: '🍽️' },
  { id: 'sides', name: 'Sides', icon: '🍟' },
  { id: 'sides', name: 'Sides', icon: '🍟' },
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
];
