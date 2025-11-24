# Local Development Guide - Running AntiFraudster in VS Code

This guide explains how to run the complete AntiFraudster project locally on your machine using VS Code.

---

## 🚀 Prerequisites

Before starting, make sure you have:
- ✅ **Node.js** installed (v18 or higher) - [Download](https://nodejs.org/)
- ✅ **npm** or **yarn** package manager
- ✅ **VS Code** installed - [Download](https://code.visualstudio.com/)
- ✅ **Git** installed - [Download](https://git-scm.com/)
- ✅ **Docker Desktop** (optional, for local Supabase) - [Download](https://www.docker.com/products/docker-desktop)

---

## 🗄️ Choose Your Backend Setup

You have **3 options** for running the backend:

### Option A: Use Existing Lovable Cloud Instance (Easiest)
- ✅ Already configured
- ✅ No setup required
- ✅ Just use the existing `.env` file
- 👉 **Skip to Step 1**

### Option B: Create Your Own Supabase Cloud Project (Recommended for Production)
- ✅ Free tier available
- ✅ Hosted and managed
- ✅ Better for production/sharing
- 👉 **Follow Section: "Setting Up Your Own Supabase Cloud Project"**

### Option C: Run Fully Local Supabase (Advanced)
- ✅ Completely offline
- ✅ Full control
- ✅ Requires Docker
- 👉 **Follow Section: "Setting Up Local Supabase with Docker"**

---

## 📥 Step 1: Clone the Repository

```bash
# Clone your repository
git clone <your-repo-url>
cd <project-folder>

# Install dependencies
npm install
```

---

## 🔑 Step 2: Get Lovable API Key (CRITICAL!)

The ML ensemble models use **Lovable AI** which requires an API key. This key is automatically provided in Lovable's hosted environment but needs to be configured for local development.

### Option A: Use Supabase Project (Recommended)

If your project was created in Lovable with Cloud enabled:

1. **Get the LOVABLE_API_KEY from Supabase secrets**:
   ```bash
   # Install Supabase CLI
   npm install -g supabase
   
   # Login to Supabase
   supabase login
   
   # Link to your project
   supabase link --project-ref xvelszpgrkmkdpgzadrs
   
   # Get secrets
   supabase secrets list
   ```

2. **Find LOVABLE_API_KEY** in the secrets list
3. **Copy the value** (starts with `la_`)

### Option B: Get Your Own Lovable API Key

1. Go to [Lovable Settings → API Keys](https://lovable.dev/settings/api-keys)
2. Create a new API key
3. Copy the key (starts with `la_`)

### Option C: Disable ML Models (For Quick Testing)

If you just want to test without ML models:
- The system will automatically fall back to rule-based scoring
- Skip this step and continue

---

## 🔧 Step 3: Configure Local Environment

### 3.1 Create `.env.local` file

Create a file named `.env.local` in the project root:

```bash
# Supabase Configuration (from your .env file)
VITE_SUPABASE_PROJECT_ID="xvelszpgrkmkdpgzadrs"
VITE_SUPABASE_PUBLISHABLE_KEY="your_anon_key_here"
VITE_SUPABASE_URL="https://xvelszpgrkmkdpgzadrs.supabase.co"

# Lovable AI Key (for ML models)
LOVABLE_API_KEY="la_your_key_here"
```

### 3.2 Set up Edge Function Secrets

For edge functions to work locally, create `supabase/.env`:

```bash
# Create directory if it doesn't exist
mkdir -p supabase

# Create .env file
cat > supabase/.env << EOF
SUPABASE_URL=https://xvelszpgrkmkdpgzadrs.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
LOVABLE_API_KEY=la_your_key_here
EOF
```

**How to get these keys**:
1. Go to your [Supabase Dashboard](https://supabase.com/dashboard/project/xvelszpgrkmkdpgzadrs/settings/api)
2. Copy:
   - **anon key** (public)
   - **service_role key** (secret - keep secure!)
3. Add them to `supabase/.env`

---

## 🆕 Setting Up Your Own Supabase Cloud Project

**Choose this if you want your own Supabase instance on supabase.com**

### Step 1: Create New Supabase Project

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Fill in:
   - **Name**: `antifraudster-project` (or any name)
   - **Database Password**: Choose a strong password (save it!)
   - **Region**: Select closest to you
   - **Pricing Plan**: Free tier works perfectly
4. Click "Create new project"
5. Wait 2-3 minutes for setup to complete

### Step 2: Get Your Project Keys

1. In your new project, click "Settings" (gear icon) → "API"
2. Copy these values:
   - **Project URL** (e.g., `https://abcdefgh.supabase.co`)
   - **Project ID** (e.g., `abcdefgh`)
   - **anon/public key** (starts with `eyJ...`)
   - **service_role key** (starts with `eyJ...`) - Keep this SECRET!

### Step 3: Update Your .env Files

Update `.env` in project root:
```bash
VITE_SUPABASE_PROJECT_ID="your_project_id_here"
VITE_SUPABASE_PUBLISHABLE_KEY="your_anon_key_here"
VITE_SUPABASE_URL="https://your_project_id.supabase.co"
```

Update `supabase/.env`:
```bash
SUPABASE_URL=https://your_project_id.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
LOVABLE_API_KEY=la_your_key_here
```

### Step 4: Configure Authentication

1. In Supabase Dashboard → "Authentication" → "Providers"
2. Enable "Email" provider
3. In "Authentication" → "Settings":
   - **Disable** email confirmations (for testing)
   - Set **Site URL** to `http://localhost:8080`
   - Add `http://localhost:8080/**` to "Redirect URLs"
4. Click "Save"

### Step 5: Run Database Migration

1. Open "SQL Editor" in Supabase Dashboard
2. Click "New Query"
3. Copy entire contents of `MIGRATION.sql` from your project
4. Paste into SQL Editor
5. Click "Run"
6. Verify: Go to "Table Editor" and check tables were created

### Step 6: Set Up Storage Bucket (Optional)

If your app needs file uploads:
1. Go to "Storage" in Supabase Dashboard
2. Click "Create bucket"
3. Name: `products` (or as needed)
4. Set to "Public" if files should be accessible
5. Click "Create"

---

## 🐳 Setting Up Local Supabase with Docker

**Choose this for completely offline development**

### Prerequisites
- ✅ Docker Desktop installed and running
- ✅ Supabase CLI installed: `npm install -g supabase`

### Step 1: Initialize Local Supabase

```bash
# In your project root
supabase init

# This creates:
# - supabase/config.toml
# - supabase/seed.sql
# - .gitignore entries
```

### Step 2: Start Local Supabase Stack

```bash
supabase start
```

This command:
- Downloads Docker images (first time only, ~2GB)
- Starts PostgreSQL, PostgREST, Auth, Storage, etc.
- Takes 2-5 minutes on first run
- Shows you local credentials when complete

**Save the output!** You'll see:
```
API URL: http://localhost:54321
DB URL: postgresql://postgres:postgres@localhost:54322/postgres
Studio URL: http://localhost:54323
anon key: eyJ... (very long key)
service_role key: eyJ... (very long key)
```

### Step 3: Update .env for Local Setup

Update `.env`:
```bash
VITE_SUPABASE_PROJECT_ID="local"
VITE_SUPABASE_PUBLISHABLE_KEY="the_anon_key_from_supabase_start"
VITE_SUPABASE_URL="http://localhost:54321"
```

Update `supabase/.env`:
```bash
SUPABASE_URL=http://localhost:54321
SUPABASE_ANON_KEY=anon_key_from_supabase_start
SUPABASE_SERVICE_ROLE_KEY=service_role_key_from_supabase_start
LOVABLE_API_KEY=la_your_key_here
```

### Step 4: Run Migration Locally

```bash
# Apply migration to local database
supabase db reset

# Or manually apply MIGRATION.sql
supabase db push
```

### Step 5: Access Local Supabase Studio

Open browser to `http://localhost:54323`
- Username: (leave blank)
- Password: (leave blank)
- Full GUI for managing database, auth, storage

### Step 6: Stop/Start Commands

```bash
# Stop local Supabase
supabase stop

# Start again (fast, uses cached containers)
supabase start

# Reset database (deletes all data)
supabase db reset

# View logs
supabase logs
```

---

## 🗄️ Step 4: Set Up Database (Skip if using Local Docker - already done!)

**If you used Option B (Supabase Cloud) or Option A (Lovable Cloud):**

### 4.1 Run Migration

Your database schema is in `MIGRATION.sql`. You need to run it:

**Option A: Using Supabase Dashboard**
1. Open [Supabase SQL Editor](https://supabase.com/dashboard) → Your Project → SQL Editor
2. Click "New Query"
3. Copy entire contents of `MIGRATION.sql`
4. Paste and click "Run"
5. Wait for success message

**Option B: Using Supabase CLI**
```bash
# Link to your cloud project
supabase link --project-ref your_project_id

# Run migration
supabase db push
```

**If you used Option C (Local Docker):**
- Already done with `supabase db reset` command above! ✅

### 4.2 Verify Database

Check that tables were created:
```bash
# In Supabase Dashboard → Table Editor (or Studio for local), you should see:
- merchant_profiles
- transactions
- customer_profiles
- fraud_patterns
- blocklist
- fraud_alerts
- ml_training_data
- products
- orders
- order_items
```

---

## 🚢 Step 5: Deploy Edge Functions Locally

### 5.1 Install Supabase CLI (if not already)
```bash
npm install -g supabase
```

### 5.2 Start Local Supabase
```bash
supabase start
```

This starts local Supabase stack (PostgreSQL, Edge Functions runtime, etc.)

### 5.3 Deploy Edge Functions Locally
```bash
# Deploy all functions
supabase functions serve

# This will serve:
# - analyze-transaction
# - generate-test-transaction
# - ml-ensemble
# - ml-predict
# - send-webhook
```

### 5.4 Update Local URLs (if using local functions)

If you want to use local edge functions instead of production:

In `src/integrations/supabase/client.ts`:
```typescript
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'http://localhost:54321';
```

---

## ▶️ Step 6: Run the Application

### 6.1 Start Development Server
```bash
npm run dev
```

The app should open at `http://localhost:8080`

### 6.2 Verify It's Working

1. **Test Frontend**:
   - Navigate to `http://localhost:8080`
   - You should see the e-commerce shop page

2. **Test Authentication**:
   - Click "Sign up"
   - Create a test account
   - Check if redirected to dashboard

3. **Test Store Settings**:
   - Navigate to `/store-settings`
   - Click "Generate" to create API key
   - Enable fraud detection
   - Click "Save Settings"

4. **Test Transaction Simulator**:
   - Navigate to `/simulator`
   - Click "Run All Scenarios (13 Tests)"
   - Watch results appear in real-time
   - Check that 3 are approved (green), 10 are blocked (red)

---

## 🧪 Step 7: Test Complete Checkout Flow

### 7.1 Add Products to Cart
1. Navigate to `/shop`
2. Add any products to cart
3. Click "View Cart"

### 7.2 Test Legitimate Purchase
1. Click "Proceed to Checkout"
2. Fill in form:
   ```
   Email: test@example.com
   Name: John Doe
   Address: 123 Main St
   City: New York
   Postal Code: 10001
   Country: US
   Card: 4111111111111111
   Expiry: 12/25
   CVV: 123
   ```
3. Click "Pay $XX.XX"
4. Should see: ✅ "Order placed successfully!" (approved)

### 7.3 Test Fraudulent Purchase
1. Add products to cart again
2. Go to checkout
3. Fill in form with suspicious data:
   ```
   Email: fraud@temp-mail.com
   Name: Suspicious Buyer
   Address: 999 Fraud St
   City: Moscow
   Postal Code: 12345
   Country: RU
   Card: 4111111111111111
   Expiry: 12/25
   CVV: 123
   ```
4. Click "Pay $XX.XX"
5. Should see: ⛔ "Payment Blocked - Fraud Detected!" with AI explanation

---

## 🔍 Step 8: Debugging & Troubleshooting

### Check Browser Console
```bash
# In VS Code, use Dev Tools
# Press F12 or right-click → Inspect
# Check Console tab for errors
```

### Check Edge Function Logs
```bash
# In terminal where supabase functions serve is running
# You'll see real-time logs:
# - "Analyzing transaction"
# - "Merchant verified"
# - "Fraud analysis complete"
# - "ML prediction received"
```

### Check Database Records
```bash
# In Supabase Dashboard → Table Editor
# Check:
# - transactions table (should have new records)
# - fraud_alerts table (should have blocked transactions)
# - customer_profiles table (should have customer data)
```

### Common Issues

**Issue 1: "LOVABLE_API_KEY not configured"**
```
Solution: Add LOVABLE_API_KEY to supabase/.env
The system will fall back to rule-based scoring if this is missing.
```

**Issue 2: "Invalid merchant API key"**
```
Solution: 
1. Go to /store-settings
2. Click "Generate" to create API key
3. Enable fraud detection
4. Save settings
```

**Issue 3: "Edge function error 500"**
```
Solution:
1. Check edge function logs
2. Verify database migration ran successfully
3. Check that merchant_profiles table has your user
4. Verify SUPABASE_SERVICE_ROLE_KEY is set
```

**Issue 4: "Cannot read property 'merchantProfile'"**
```
Solution:
1. Check that merchant_profiles table exists
2. Check that your user has a profile row
3. Re-login to refresh auth state
```

**Issue 5: "Simulator shows no results"**
```
Solution:
1. Open browser console
2. Look for network errors
3. Verify edge functions are running
4. Check API key is generated
```

---

## 📊 Verify ML Models Are Working

### Check ML Ensemble Logs

When running simulator, look for these logs in edge function console:

```
ML Ensemble prediction request: { amount: 2999.99, ... }
Individual model predictions: [
  { model: 'random_forest', probability: 0.72 },
  { model: 'xgboost', probability: 0.81 },
  { model: 'isolation_forest', probability: 0.88 }
]
Ensemble prediction result: { fraud_score: 80, is_fraud: true }
```

### Verify XAI Explanations

Blocked transactions should show:
```
AI Explanation (XAI):
"Transaction blocked due to suspicious velocity pattern and new customer risk. 
15 rapid transactions detected within 10 minutes, indicating automated fraud attempt."

Risk Factors:
- velocity_check: +20 points
- new_customer_high_value: +25 points
- Customer trust adjustment: +10 points
```

---

## 🎯 Production vs Local Differences

| Feature | Production (Lovable) | Local (VS Code) |
|---------|---------------------|-----------------|
| **Edge Functions** | Auto-deployed | Must run `supabase functions serve` |
| **LOVABLE_API_KEY** | Auto-injected | Must set manually |
| **Database** | Supabase Cloud | Supabase Cloud (same) |
| **Frontend** | Hosted on Lovable | `http://localhost:8080` |
| **Hot Reload** | Automatic | Automatic (Vite) |
| **Debugging** | Limited | Full access (DevTools) |

---

## 🚀 Final Checklist

Before demoing, verify:

- [ ] ✅ Frontend loads at `http://localhost:8080`
- [ ] ✅ Can sign up and login
- [ ] ✅ API key can be generated in `/store-settings`
- [ ] ✅ Fraud detection can be enabled
- [ ] ✅ Transaction simulator works (`/simulator`)
- [ ] ✅ 13 scenarios run successfully
- [ ] ✅ 3 legitimate transactions approved (green)
- [ ] ✅ 10 fraudulent transactions blocked (red)
- [ ] ✅ AI explanations appear for blocked transactions
- [ ] ✅ Real checkout can process legitimate order
- [ ] ✅ Real checkout blocks fraudulent order with explanation
- [ ] ✅ ML ensemble logs show 3 model predictions
- [ ] ✅ Database has transaction records
- [ ] ✅ Fraud alerts created for blocked transactions

---

## 📞 Still Having Issues?

### Check These Files
1. `.env.local` - Frontend environment variables
2. `supabase/.env` - Edge function secrets
3. `MIGRATION.sql` - Database schema
4. `supabase/config.toml` - Edge function configuration

### Useful Commands
```bash
# Restart everything
npm run dev          # Restart frontend
supabase functions serve --env-file supabase/.env  # Restart edge functions

# Check logs
# Browser console (F12)
# Terminal where functions serve is running

# Reset database (CAUTION: deletes all data)
supabase db reset

# Update edge functions
supabase functions deploy analyze-transaction
supabase functions deploy generate-test-transaction
supabase functions deploy ml-ensemble
```

---

## 🎉 You're Ready!

Once all checkboxes are ✅:
- Your local environment is fully functional
- ML models are working via Lovable AI
- Real-time payment blocking is active
- XAI explanations are being generated
- Ready to demo or present!

**Note**: The system works identically in local development and production. The only difference is that edge functions need to be manually started locally, whereas they're automatic in Lovable's hosted environment.
