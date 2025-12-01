# Stripe Product Setup Guide

## Quick Fix for Checkout Error

You're seeing "Some products are not configured for payment" because your products need to be mapped to Stripe Price IDs.

## Steps to Fix:

### 1. Get Your Database Product IDs

First, check your products in the database:
- Open your backend (Cloud tab)
- Go to Database → Tables → products
- Note down the `id` column values for each product

### 2. Create Products in Stripe

1. Go to [Stripe Dashboard - Products](https://dashboard.stripe.com/test/products)
2. Click "Add Product" for each item
3. Fill in:
   - Name (e.g., "iPhone 15 Pro")
   - Price (e.g., $1199.99)
   - Currency (e.g., USD)
4. Click "Save product"
5. **Copy the Price ID** (starts with `price_`) - NOT the product ID

### 3. Update the Mapping File

Open `src/config/stripe-products.ts` and add your mappings:

```typescript
export const STRIPE_PRICE_MAPPING: Record<string, string> = {
  // Format: 'database_product_id': 'stripe_price_id',
  'your-db-product-id-1': 'price_1ABC123xyz...',
  'your-db-product-id-2': 'price_1DEF456xyz...',
  // Add all your products here
};
```

### 4. Example

If your database has:
- Product ID: `123e4567-e89b-12d3-a456-426614174000`
- Name: iPhone 15 Pro
- Price: $1199.99

And Stripe gives you:
- Price ID: `price_1QRzAB2eZvKYlo2CxYZ123AB`

Your mapping should be:
```typescript
export const STRIPE_PRICE_MAPPING: Record<string, string> = {
  '123e4567-e89b-12d3-a456-426614174000': 'price_1QRzAB2eZvKYlo2CxYZ123AB',
};
```

## Test Payment

After updating the mapping:
1. Add items to cart
2. Go to checkout
3. Use test card: `4242 4242 4242 4242`
4. Any future date for expiry
5. Any 3-digit CVC

## ML API Server Check

To verify your Python ML server is working:

### Method 1: Browser Check
Open in your browser: http://localhost:8000

You should see:
```json
{
  "status": "ok",
  "message": "ML Fraud Detection API",
  "model_loaded": true
}
```

### Method 2: Terminal Check
Look for these logs in your terminal:
```
 * Running on http://127.0.0.1:8000
Model loaded successfully
Advanced model loaded: Random Forest
```

### Method 3: Test Prediction
Run the test script:
```bash
python ml_models/predict_advanced.py
```

If you see predictions with fraud scores, it's working!

## Common Issues

**Error: "Some products are not configured"**
→ You haven't added all product mappings in `stripe-products.ts`

**ML API not responding**
→ Make sure you ran `python api_server.py` in the ml_models directory

**Stripe error: "No such price"**
→ Double-check you copied the Price ID (not Product ID) from Stripe
