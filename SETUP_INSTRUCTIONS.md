# AntiFraudster - Complete Demo Guide

## 🚀 Quick Setup
1. Run `MIGRATION.sql` in Supabase SQL Editor
2. Start app: `npm run dev`
3. Visit `/shop` to test e-commerce

## 🎯 Demo Flow (Show to Evaluators)

### Phase 1: Enable Integration (5 min)
1. **Generate API Key**: Go to `/store-settings` → Click "Generate"
2. **Connect Dashboard**: Go to `/vendors` → Paste API Key + Store URL → Save
3. **Enable Detection**: Back to `/store-settings` → Toggle ON → Save

### Phase 2: Test with Simulator (10 min)
1. **Navigate**: Go to `/simulator` in dashboard
2. **Run All**: Click "Run All Scenarios" button
3. **Show Results**:
   - ✅ Legitimate transactions (green, low scores)
   - ❌ Fraudulent transactions (red, high scores, BLOCKED)
4. **Explain**: Point out AI explanations for each decision

### Phase 3: Manual E-Commerce Test (Optional)
- **Normal**: Small purchase, US address → APPROVED
- **Fraud**: Large purchase, suspicious details → BLOCKED

## 🎓 Transaction Simulator Features
- **6 Pre-configured Scenarios**:
  - Legitimate (low/high value)
  - Fraud patterns (velocity, blacklist, geolocation, new customer)
- **Instant Testing**: No need to manually fill checkout forms
- **Real Results**: Actual fraud detection with scores & explanations

## 📝 Integration Code (For External Stores)

```javascript
// Checkout integration
const { data } = await supabase.functions.invoke('analyze-transaction', {
  body: {
    transaction_id: orderId,
    amount: total,
    customer_email: email,
    merchant_id: yourMerchantId
  }
});

if (data.is_fraud) {
  blockPayment();
}
```

## ✅ Pre-Demo Checklist
- [ ] Migration completed
- [ ] Products visible at `/shop`
- [ ] API key generated
- [ ] Integration connected
- [ ] Simulator tested at `/simulator`

**You're ready! 🎉**
