# 🔐 Real Stripe Payment Setup Guide

Your fraud detection platform now uses **real Stripe payments** instead of simulations!

## ✅ What's Already Done

- ✅ Stripe integration enabled
- ✅ Edge functions created (`create-checkout`, `verify-payment`)
- ✅ Checkout page integrated with Stripe
- ✅ Success and cancel pages added
- ✅ Guest checkout supported (no login required)
- ✅ ML fraud detection integrated with real payments

## 📋 Setup Steps

### Step 1: Create Products in Stripe Dashboard

1. Go to: https://dashboard.stripe.com/test/products
2. Click **"Add Product"** for each item you want to sell
3. Fill in:
   - Product name (e.g., "Premium Laptop Pro")
   - Description
   - Price in USD
   - Click **"Save product"**
4. **Copy the Price ID** (starts with `price_`)

### Step 2: Map Products to Stripe Prices

Open `src/config/stripe-products.ts` and add your mappings:

```typescript
export const STRIPE_PRICE_MAPPING: Record<string, string> = {
  // Your database product ID → Stripe price ID
  'prod_abc123': 'price_1ABC123def456GHI789jkl',
  'prod_xyz789': 'price_1XYZ789ghi012JKL345mno',
  // Add more mappings here
};
```

**How to find product IDs:**
- Database product IDs: Check your `products` table in the database
- Stripe price IDs: Copy from Stripe Dashboard after creating products

### Step 3: Test the Payment Flow

1. **Add items to cart** from /shop
2. **Go to checkout** at /checkout
3. **Fill in shipping details**
4. **Click "Proceed to Payment"**
5. **Use Stripe test card:**
   - Card: `4242 4242 4242 4242`
   - Expiry: Any future date (e.g., `12/34`)
   - CVC: Any 3 digits (e.g., `123`)
6. **Complete payment** in Stripe Checkout
7. **Verify** you're redirected to /payment-success

## 🔬 ML Fraud Detection Integration

The system automatically:
1. ✅ Collects transaction data during checkout
2. ✅ Sends to `/verify-payment` edge function after Stripe confirms payment
3. ✅ Calls `analyze-transaction` with ML fraud detection
4. ✅ Updates order with fraud score (0-100)
5. ✅ Creates fraud alerts if score >= 70
6. ✅ Displays in dashboard with real-time updates

## 🌐 How It Works

### Frontend Flow
```
Shop → Cart → Checkout Form → Stripe Checkout (new tab) → Success/Cancel
```

### Backend Flow
```
create-checkout → Stripe API → Checkout Session
verify-payment → Stripe API → Order Created → ML Analysis → Dashboard Update
```

### Edge Functions

**`create-checkout`**
- Creates Stripe checkout session
- Supports guest and authenticated users
- Passes order metadata to Stripe

**`verify-payment`**
- Verifies payment status with Stripe
- Creates order in database
- Calls ML fraud detection
- Updates order with fraud score

## 📊 Testing Different Scenarios

### Test Cards for Different Outcomes

| Card Number | Result | Fraud Score |
|-------------|--------|-------------|
| 4242 4242 4242 4242 | Success | Varies based on ML |
| 4000 0000 0000 0002 | Declined | N/A |
| 4000 0025 0000 3155 | Requires authentication | Varies |

### Testing High-Risk Transactions

To trigger ML fraud alerts, test with:
- **High amounts** (> $500)
- **Late night times** (2-6 AM local time)
- **Mismatched countries** (use VPN or international addresses)
- **Multiple rapid transactions** (velocity checks)

## 🚀 Going Live

### Switch to Production Mode

1. **Get real Stripe keys:**
   - Go to: https://dashboard.stripe.com/apikeys
   - Copy **Live** publishable and secret keys

2. **Update secrets:**
   - In Lovable, go to Settings → Secrets
   - Update `STRIPE_SECRET_KEY` with live key

3. **Create live products:**
   - Repeat Step 1 in **Live** mode (not Test)
   - Update price mappings in `stripe-products.ts`

4. **Deploy:**
   - Click "Publish" in Lovable
   - Your app is live with real payments!

## 🔒 Security Notes

- ✅ Card details **never** touch your server (handled by Stripe)
- ✅ Guest checkout supported (no forced registration)
- ✅ All payments verified server-side
- ✅ Fraud detection runs on every transaction
- ✅ Sensitive data encrypted in transit and at rest

## 📞 Support

**Need help?**
- Check Stripe logs: https://dashboard.stripe.com/test/logs
- View edge function logs in Lovable Cloud
- Test with Stripe CLI for debugging

**Common Issues:**
- "Missing price ID" → Update `stripe-products.ts` with correct mappings
- "Payment failed" → Check Stripe Dashboard for error details
- "Fraud detection not working" → Ensure ML models are trained (see ML_DATASET_DOCUMENTATION.md)

---

**Congratulations!** 🎉 Your shop now processes real payments with ML-powered fraud detection!
