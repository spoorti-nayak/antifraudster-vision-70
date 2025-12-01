/**
 * Stripe Product Mapping Configuration
 * 
 * IMPORTANT: You need to create products in your Stripe Dashboard first!
 * 
 * Steps to set up:
 * 1. Go to https://dashboard.stripe.com/test/products
 * 2. Click "Add Product" for each item you want to sell
 * 3. Set the price and get the price ID (starts with price_)
 * 4. Copy the price ID below
 * 
 * Format: { [productId from your database]: 'price_xxxxx' }
 */

export const STRIPE_PRICE_MAPPING: Record<string, string> = {
  // Example mappings - replace with your actual product IDs and Stripe price IDs
  // 'prod_123': 'price_1ABC123...',
  // 'prod_456': 'price_1DEF456...',
  
  // TODO: Add your product ID to Stripe price ID mappings here
  // You can find product IDs in your database and price IDs in Stripe Dashboard
};

/**
 * Helper function to get Stripe price ID for a product
 */
export function getStripePriceId(productId: string): string | null {
  return STRIPE_PRICE_MAPPING[productId] || null;
}

/**
 * Check if a product has a Stripe price configured
 */
export function hasStripePrice(productId: string): boolean {
  return productId in STRIPE_PRICE_MAPPING;
}
