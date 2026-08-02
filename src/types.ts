export interface MenuItemSize {
  id: string;
  name: string; // e.g., 'كبير', 'وسط', 'صغير', 'نصف كيلو', 'كيلو'
  price: number;
  originalPrice?: number;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  image: string;
  category: string; // e.g., 'Popular', 'Burgers', 'Pizzas', 'Drinks', 'Dessert'
  sizes?: MenuItemSize[]; // Optional sizes/variants
}

export interface Restaurant {
  id: string;
  name: string;
  rating: number;
  distance: number; // in km
  deliveryTime: string; // e.g., '15-25 min'
  deliveryFee: number;
  promo?: string; // e.g. 'FREE DELIVERY' or 'PROMO AVAILABLE'
  coverImage: string;
  categories: string[]; // e.g., ['Burgers', 'Pizza']
  descriptionString: string;
  menu: MenuItem[];
  openTime?: string; // e.g., '09:00' (24-hour style)
  closeTime?: string; // e.g., '23:30'
  whatsappNumber?: string; // restaurant specific WhatsApp number to send orders directly
}

export interface CartItem {
  menuItem: MenuItem;
  selectedSize?: MenuItemSize; // The specific size chosen by the customer
  quantity: number;
  restaurantId: string;
  restaurantName: string;
}

export interface Order {
  id: string;
  restaurant: Restaurant;
  items: CartItem[];
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  status: 'Pending' | 'Received' | 'Preparing' | 'OutForDelivery' | 'Delivered';
  createdAt: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  eta: number; // in minutes
  courierName?: string;
  courierPhone?: string;
  paymentMethod?: string;
  paymentDetails?: string;
  vodafoneFee?: number;
  doorstepDelivery?: boolean;
  reviewed?: boolean;
}

export interface Review {
  id: string;
  orderId: string;
  customerName: string;
  restaurantId: string;
  restaurantName: string;
  courierId?: string; // Optional (or courierName)
  courierName?: string;
  ratingDeliverySpeed: number; // 1-5 stars
  ratingDeliveryManner: number; // 1-5 stars
  ratingFoodQuality: number; // 1-5 stars
  comment: string;
  createdAt: string;
}
