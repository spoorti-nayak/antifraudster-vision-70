# 🚀 Complete Setup Guide - Fraud Detection Platform

This guide covers everything you need to run both the web application (VS Code) and ML models (Anaconda).

---

## 📋 Prerequisites

- **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
- **Git** - [Download](https://git-scm.com/)
- **Anaconda** - [Download](https://www.anaconda.com/download)
- **VS Code** (recommended) - [Download](https://code.visualstudio.com/)

---

## Part 1: Setup Web Application (VS Code)

### Step 1: Clone the Repository

```bash
# Clone your GitHub repository
git clone <your-github-repo-url>
cd fraud-detection-platform

# Install dependencies
npm install
```

### Step 2: Configure Environment Variables

The `.env` file should already exist with your Supabase credentials:

```env
VITE_SUPABASE_PROJECT_ID="your-project-id"
VITE_SUPABASE_PUBLISHABLE_KEY="your-publishable-key"
VITE_SUPABASE_URL="your-supabase-url"
```

✅ These are already configured automatically by Lovable Cloud.

### Step 3: Run the Development Server

```bash
# Start the development server
npm run dev
```

The application will open at: **http://localhost:5173**

### Step 4: Test the Application

1. **Visit Demo Store**: Go to `/shop` to see the e-commerce demo
2. **Add items to cart** and proceed to checkout
3. **Submit a payment** - it will be analyzed by the fraud detection system
4. **View Results**: Check `/dashboard` to see the transaction analysis

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
```

---

## Part 2: Setup ML Models (Anaconda)

### Step 1: Open Anaconda Prompt

**Windows**: Search for "Anaconda Prompt" in Start Menu  
**Mac/Linux**: Open Terminal

### Step 2: Create Python Environment

```bash
# Create a new conda environment
conda create -n fraud_ml python=3.10 -y

# Activate the environment
conda activate fraud_ml
```

### Step 3: Navigate to ML Directory

```bash
# Windows
cd C:\Users\YourName\path\to\fraud-detection-platform\ml_models

# Mac/Linux
cd /Users/YourName/path/to/fraud-detection-platform/ml_models
```

### Step 4: Install Python Dependencies

```bash
pip install -r requirements.txt
```

This will install:
- pandas, numpy (data processing)
- scikit-learn (ML models)
- tensorflow, keras (neural networks)
- joblib (model saving)
- jupyter (notebooks)
- flask (API server)
- matplotlib, seaborn (visualization)

### Step 5: Train ML Models

```bash
python train.py
```

**What happens:**
1. ✅ Generates synthetic training data (10,000 transactions)
2. ✅ Trains 6 models: Logistic Regression, Random Forest, Gradient Boosting, SVM, Naive Bayes, Neural Network
3. ✅ Evaluates performance (accuracy, AUC-ROC)
4. ✅ Saves best model to `trained_models/`

**Expected Output:**
```
🤖 Fraud Detection ML Training Pipeline
========================================
📊 Loading Data: 10,000 transactions
🔧 Feature Engineering: 8 features
✂️  Splitting Data: 8,000 train / 2,000 test
🎓 Training Models...
1️⃣  Training Logistic Regression...
   ✅ Accuracy: 92.50%
   ✅ AUC-ROC: 0.948
2️⃣  Training Random Forest...
   ✅ Accuracy: 94.80%
   ✅ AUC-ROC: 0.956
... (continues for all 6 models)
🏆 Best Model: RANDOM_FOREST (AUC: 0.956)
💾 Saved to trained_models/
```

### Step 6: Test Predictions (Optional)

```bash
python predict.py
```

Tests the trained models with sample transactions.

### Step 7: Start ML API Server (Optional - For Production)

```bash
python api_server.py
```

This starts a Flask API server on **http://localhost:8000** that serves ML predictions.

**To integrate with your app:**
1. Keep the Flask server running in Anaconda
2. Uncomment the ML integration code in `supabase/functions/ml-predict/index.ts`
3. Your app will now use ML models instead of just rule-based detection

---

## Part 3: Using Jupyter Notebooks (Optional)

### Start Jupyter

```bash
# In Anaconda Prompt (with fraud_ml environment active)
jupyter notebook
```

This will open Jupyter in your browser. Navigate to:
- `notebooks/fraud_detection.ipynb` - Interactive ML experimentation

---

## 📂 Project Structure

```
fraud-detection-platform/
├── src/                          # Frontend React app (VS Code)
│   ├── pages/
│   │   ├── Shop.tsx             # E-commerce store
│   │   ├── Cart.tsx             # Shopping cart
│   │   ├── Checkout.tsx         # Checkout with fraud detection
│   │   ├── Dashboard.tsx        # Admin dashboard
│   │   └── ...
│   └── ...
├── supabase/
│   └── functions/
│       ├── analyze-transaction/ # Fraud detection edge function
│       └── ml-predict/          # ML prediction endpoint
├── ml_models/                   # ML training (Anaconda)
│   ├── train.py                 # Train all models
│   ├── predict.py               # Test predictions
│   ├── api_server.py            # Flask API server
│   ├── requirements.txt         # Python dependencies
│   ├── notebooks/
│   │   └── fraud_detection.ipynb
│   ├── datasets/                # Generated on first run
│   │   └── fraud_transactions.csv
│   └── trained_models/          # Generated after training
│       ├── best_model.pkl
│       ├── scaler.pkl
│       └── ...
└── package.json                 # Node.js dependencies
```

---

## 🔄 How Everything Works Together

### Current Setup (Rule-Based Detection)

```
Customer → Shop → Checkout → analyze-transaction (Rules) → Dashboard
```

The system uses rule-based fraud detection (no ML models required).

### With ML Integration (After Training)

```
Customer → Shop → Checkout → analyze-transaction (Rules 40% + ML 60%) → Dashboard
                                                      ↓
                                              ml-predict API (Flask)
                                                      ↓
                                              trained_models/*.pkl
```

1. **Customer** browses shop, adds items to cart
2. **Checkout** processes payment and sends transaction data
3. **analyze-transaction** edge function:
   - Applies rule-based checks (40% weight)
   - Calls ML API for ML score (60% weight)
   - Combines scores to determine fraud risk
4. **Dashboard** shows transaction analysis and fraud alerts

---

## 💡 Daily Workflow

### Working on Frontend/Backend (VS Code)

```bash
# Start VS Code
code .

# Run dev server
npm run dev

# Make changes to React components, edge functions, etc.
# Changes hot-reload automatically
```

### Working on ML Models (Anaconda)

```bash
# Open Anaconda Prompt
conda activate fraud_ml

# Navigate to ml_models
cd path/to/fraud-detection-platform/ml_models

# Experiment with notebooks
jupyter notebook

# Or retrain models with new data
python train.py

# Or run API server for integration
python api_server.py
```

**They work independently but connect via the Flask API!**

---

## 🧪 Testing the System

### 1. Test E-Commerce Flow

1. Go to http://localhost:5173/shop
2. Add products to cart
3. Proceed to checkout
4. Fill in customer details
5. Submit payment
6. Check dashboard for fraud analysis

### 2. Test High-Risk Transaction

Use these values to trigger fraud detection:
- **Amount**: $5,000+ (high amount)
- **Email**: newemail@test.com (new customer)
- This should result in a higher fraud score

### 3. View Results

Go to http://localhost:5173/dashboard to see:
- Transaction stream
- Fraud alerts
- Analytics charts
- Risk distribution

---

## 🛠️ Troubleshooting

### VS Code Issues

**Error: "Cannot find module..."**
```bash
rm -rf node_modules package-lock.json
npm install
```

**Port already in use**
```bash
# Change port in vite.config.ts or kill process
npx kill-port 5173
```

### Anaconda Issues

**Error: "ModuleNotFoundError: No module named 'sklearn'"**
```bash
conda activate fraud_ml
pip install -r requirements.txt
```

**Environment activation fails**
```bash
# Recreate environment
conda env remove -n fraud_ml
conda create -n fraud_ml python=3.10 -y
conda activate fraud_ml
pip install -r requirements.txt
```

**Training takes too long**
- This is normal for Neural Networks (~2-3 minutes)
- SVM can also take time on large datasets
- Other models train quickly (<10 seconds each)

---

## 🎯 Next Steps

1. ✅ **Run both environments** (VS Code + Anaconda)
2. ✅ **Test the demo store** and fraud detection
3. ✅ **Train ML models** with your own data
4. ✅ **Integrate ML API** (optional, for production)
5. ✅ **Deploy to production** via Lovable publish button

---

## 📚 Additional Resources

- **ML Models Guide**: `ml_models/README.md`
- **Lovable Docs**: https://docs.lovable.dev
- **Supabase Docs**: https://supabase.com/docs
- **Stripe Docs**: https://stripe.com/docs

---

## ❓ Need Help?

If you encounter issues:
1. Check the console logs in browser DevTools
2. Check Anaconda terminal for Python errors
3. Verify all dependencies are installed
4. Make sure both environments are activated

**Current System Status:**
- ✅ Rule-based fraud detection is ACTIVE (works without ML)
- ✅ Demo e-commerce store is READY
- ✅ ML models can be trained in Anaconda
- ✅ ML integration is OPTIONAL (for enhanced accuracy)

Good luck! 🚀
