# AntiFraudster E-Commerce Setup Instructions

## 🚀 Quick Start Guide

### 1. Clone and Install
```bash
git clone <your-repo-url>
cd <project-folder>
npm install
```

### 2. Run Database Migration

**Option A: Using Supabase Dashboard (Recommended)**
1. Open your browser and go to your Supabase project
2. Click on "SQL Editor" in the left sidebar
3. Click "New Query"
4. Copy the entire contents of `MIGRATION.sql` file
5. Paste it into the SQL editor
6. Click "Run" to execute the migration

**Option B: Using Lovable (When DB Connection Works)**
- The AI will run the migration automatically when the connection is restored

### 3. Start Development Server
```bash
npm run dev
```

The app will open at `http://localhost:8080` (or another port if 8080 is busy)

---

## 🛍️ E-Commerce Store Setup

### Initial State (No Fraud Detection)
When you first visit the shop at `/shop`, the store works as a normal e-commerce site:
- Browse products
- Add to cart
- Checkout
- No fraud detection is active

### Enabling Fraud Detection (Live Demo for Evaluators)

#### Step 1: Generate Store API Key
1. Navigate to `/store-settings`
2. Click "Generate" to create your API key
3. Copy the generated API key

#### Step 2: Configure AntiFraudster Dashboard
1. Login to the AntiFraudster dashboard (main app)
2. Go to "Vendors" page (`/vendors`)
3. Paste your Store's API Key
4. Paste your Store URL (e.g., `http://localhost:8080`)
5. Click "Save Integration"

#### Step 3: Enable Fraud Detection on Store
1. Go back to `/store-settings`
2. Toggle "Enable Fraud Detection" to ON
3. (Optional) Add webhook URL to receive real-time alerts
4. Click "Save Settings"

#### Step 4: Test the Integration
1. Go to the shop at `/shop`
2. Add products to cart
3. Proceed to checkout at `/checkout`
4. Fill in the checkout form
5. Complete the purchase

**What Happens:**
- Transaction is sent to `analyze-transaction` edge function
- ML models analyze the transaction in real-time
- If fraud is detected:
  - ❌ Payment is BLOCKED
  - Order status set to "blocked"
  - Alert shows fraud score and explanation
  - Webhook is sent (if configured)
- If legitimate:
  - ✅ Payment is APPROVED
  - Order status set to "completed"
  - Success message shown

---

## 🤖 ML Models Setup (VS Code)

### Prerequisites
- Anaconda/Miniconda installed
- Python 3.8+

### Setup ML Environment
```bash
cd ml_models

# Create conda environment
conda create -n fraud-detection python=3.9
conda activate fraud-detection

# Install dependencies
pip install -r requirements.txt

# Train the advanced ML models
python train_advanced.py

# Start ML API server
python api_server.py
```

The ML API will run on `http://localhost:5000`

### Connect ML Models to Edge Function

Update `supabase/functions/ml-predict/index.ts` to use your local ML server:
```typescript
const ML_API_URL = 'http://localhost:5000/predict';
```

---

## 🔐 Production Security Features

### Authentication
- ✅ Proper JWT tokens from Supabase
- ✅ Row Level Security (RLS) policies
- ✅ Protected routes
- ✅ Session management

### API Security
- ✅ API key validation
- ✅ Domain verification
- ✅ Fraud detection enabled/disabled checks
- ✅ Rate limiting (via edge functions)

### Fraud Detection
- ✅ Real-time analysis during checkout
- ✅ ML model predictions
- ✅ Configurable thresholds
- ✅ Webhook alerts
- ✅ Transaction blocking

### Data Protection
- ✅ Encrypted API keys
- ✅ Secure payment data handling
- ✅ User data isolation via RLS
- ✅ HTTPS in production

---

## 📊 Database Tables

### Products
- Stores e-commerce product catalog
- Public read access
- Sample data includes 12 tech products

### Orders
- Stores customer orders
- User-specific access via RLS
- Includes fraud_score field
- Status: pending, completed, blocked

### Order Items
- Links orders to products
- User-specific access via RLS
- Stores quantity and price snapshots

### Merchant Profiles (Updated)
- Added `fraud_detection_enabled` boolean
- Added `webhook_url` text field
- Stores API keys and integration settings

---

## 🎯 Demo Flow for Evaluators

### Scenario 1: Normal E-Commerce (No Fraud Detection)
1. Show the shop works without AntiFraudster
2. Complete a purchase successfully
3. Show order in database

### Scenario 2: Enabling Fraud Detection
1. Generate API key in store settings
2. Add credentials to AntiFraudster dashboard
3. Enable fraud detection
4. Show the integration is "Connected"

### Scenario 3: Fraud Detection in Action
1. Place an order with suspicious patterns
2. Show real-time blocking at checkout
3. Display fraud score and AI explanation
4. Show blocked order in dashboard
5. Demonstrate webhook alert (if configured)

### Scenario 4: Legitimate Transaction
1. Place a normal order
2. Show it passes fraud detection
3. Confirm order is completed
4. Show in transactions dashboard

---

## 🔧 Troubleshooting

### Database Connection Issues
- Check `.env` file has correct Supabase credentials
- Verify Supabase project is active
- Run migration manually via Supabase dashboard

### ML Models Not Working
- Ensure conda environment is activated
- Check `api_server.py` is running
- Verify models are trained (`train_advanced.py`)
- Check edge function points to correct ML API URL

### Fraud Detection Not Triggering
- Verify `fraud_detection_enabled` is true in merchant_profiles
- Check API key matches between store and dashboard
- Ensure edge function is deployed
- Check browser console for errors

### Cart Not Persisting
- Cart uses localStorage
- Check browser allows localStorage
- Clear cache if issues persist

---

## 📁 Project Structure

```
/
├── src/
│   ├── pages/
│   │   ├── Shop.tsx                 # Product listing
│   │   ├── ProductDetail.tsx        # Single product view
│   │   ├── Cart.tsx                 # Shopping cart
│   │   ├── Checkout.tsx             # Checkout & fraud detection
│   │   ├── StoreSettings.tsx        # Store configuration
│   │   ├── Dashboard.tsx            # AntiFraudster dashboard
│   │   └── Vendors.tsx              # Integration management
│   ├── contexts/
│   │   └── CartContext.tsx          # Cart state management
│   └── ...
├── supabase/
│   └── functions/
│       ├── analyze-transaction/     # Fraud detection logic
│       └── ml-predict/              # ML model integration
├── ml_models/
│   ├── train_advanced.py            # ML training
│   ├── api_server.py                # ML API server
│   └── requirements.txt
├── MIGRATION.sql                     # Database setup
└── SETUP_INSTRUCTIONS.md            # This file
```

---

## ✅ Production Checklist

- [ ] Database migration completed
- [ ] Sample products loaded
- [ ] ML models trained
- [ ] API server running (if using local ML)
- [ ] Edge functions deployed
- [ ] RLS policies verified
- [ ] Authentication tested
- [ ] Fraud detection tested
- [ ] Webhook integration tested
- [ ] Security scan passed

---

## 🎓 Key Features for Evaluators

1. **Real E-Commerce**: Fully functional shopping experience
2. **Live Integration**: Actual API key and domain verification
3. **Real-time Fraud Detection**: ML-powered analysis during checkout
4. **Transaction Blocking**: Payments stopped for high-risk transactions
5. **AI Explanations**: Clear fraud reasoning using XAI
6. **Production Security**: Proper auth, RLS, and data protection
7. **Webhook Alerts**: Real-time notifications
8. **ML Models**: Multiple algorithms (RF, XGBoost, Isolation Forest)

---

## 📞 Support

If you encounter issues:
1. Check browser console for errors
2. Verify `.env` configuration
3. Ensure database migration ran successfully
4. Check edge function logs in Supabase
5. Verify ML models are trained and running

---

**You're ready to demonstrate AntiFraudster! 🎉**
