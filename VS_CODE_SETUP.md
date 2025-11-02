# VS Code Setup Guide

## Prerequisites
- Node.js (v18 or higher) installed
- Git installed
- VS Code installed

## Step 1: Clone and Open Project

```bash
# Clone the repository
git clone <your-repo-url>
cd <project-folder>

# Open in VS Code
code .
```

## Step 2: Install Dependencies

```bash
# Install all Node.js dependencies
npm install
```

## Step 3: Environment Setup

The `.env` file is already configured with Lovable Cloud credentials. You don't need to create or modify it.

**Verify your `.env` file contains:**
```
VITE_SUPABASE_PROJECT_ID="xvelszpgrkmkdpgzadrs"
VITE_SUPABASE_PUBLISHABLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
VITE_SUPABASE_URL="https://xvelszpgrkmkdpgzadrs.supabase.co"
```

## Step 4: Start Development Server

```bash
# Start the development server
npm run dev
```

The application will open at `http://localhost:5173` or `http://localhost:8080`

## Step 5: Test Authentication

1. Navigate to `http://localhost:5173/signup`
2. Create a new account (email confirmation is disabled for easy testing)
3. You should be automatically logged in and redirected to the dashboard
4. Test the forgot password feature at `/forgot-password`

## Common Issues & Solutions

### Issue: "Module not found" errors
**Solution:**
```bash
rm -rf node_modules package-lock.json
npm install
```

### Issue: Port 5173 already in use
**Solution:**
```bash
# The dev server will automatically try port 8080
# Or manually specify a port:
npm run dev -- --port 3000
```

### Issue: Authentication errors
**Solutions:**
1. Clear browser cache and localStorage
2. Verify `.env` file exists and has correct values
3. Check Lovable Cloud backend is accessible

### Issue: Blank page after login
**Solution:**
- Open browser console (F12)
- Check for errors
- Verify all dependencies installed: `npm install`

## Next Steps - ML Models Setup in Anaconda

After `npm run dev` is running in VS Code, follow these steps in Anaconda:

### 1. Install Anaconda
Download from: https://www.anaconda.com/download

### 2. Open Anaconda Prompt in YOUR Project Folder

**CRITICAL**: You must navigate to your project root first!

**Windows:**
```bash
# Open Anaconda Prompt, then navigate to your project
# Example - replace with YOUR actual path:
cd C:\Users\YourName\Documents\fraud-detection-system
```

**Mac/Linux:**
```bash
# Open Terminal, then navigate to your project
# Example - replace with YOUR actual path:
cd ~/Documents/fraud-detection-system
```

**Verify you're in the right folder:**
```bash
dir          # Windows - you should see ml_models folder
ls           # Mac/Linux - you should see ml_models folder
```

### 3. Create Python Environment

```bash
# Create environment with Python 3.10
conda create -n fraud_ml python=3.10 -y

# Activate it
conda activate fraud_ml
```

### 4. Install All ML Dependencies

```bash
# This installs XGBoost, LightGBM, CatBoost, TensorFlow, etc. (takes 3-5 min)
pip install -r ml_models/requirements.txt
```

### 5. Train Advanced Production Models

```bash
# Train all 6 advanced models + ensemble (takes 2-5 minutes)
python ml_models/train_advanced.py
```

**What this creates:**
- `trained_models/advanced/best_model.pkl` - Best performing model
- `trained_models/advanced/scaler.pkl` - Feature scaler
- `trained_models/advanced/metadata.pkl` - Performance metrics
- Individual models: XGBoost, LightGBM, CatBoost, Random Forest, Deep NN, Isolation Forest

**Expected Output:**
- Training metrics for all 6 models
- AUC-ROC scores (should be 93-96%)
- Best model selection

### 6. Test the Models

```bash
# Test predictions on 4 sample transactions
python ml_models/predict_advanced.py
```

You should see fraud probability predictions with risk levels.

---

## How ML Models Connect to VS Code App

**IMPORTANT**: They run **INDEPENDENTLY** - no connection needed!

### Current State:
- **VS Code** (`npm run dev` on port 8080): Uses **rule-based fraud detection** ✅
- **Anaconda** (ML models): Trained and ready in `trained_models/` folder ✅

### Option A: Keep Separate (Recommended)
Your app already works with rule-based detection. ML models are trained and saved for future use.

**VS Code Terminal:**
```bash
npm run dev              # App on http://localhost:8080
```

**Anaconda Terminal (optional):**
```bash
conda activate fraud_ml
python ml_models/api_server.py   # ML API on http://localhost:8000
```

### Option B: Connect ML to App (Advanced)
To replace rule-based with ML predictions:

**1. Start ML API (Anaconda Terminal):**
```bash
conda activate fraud_ml
python ml_models/api_server.py
```

**2. Update Edge Function (VS Code):**
- Open `supabase/functions/ml-predict/index.ts`
- Uncomment lines 33-53 (Python API integration)
- Save the file

**3. Keep Both Running:**
- VS Code: `npm run dev`
- Anaconda: `python ml_models/api_server.py`

Now transactions will use ML models instead of rules!

---

## Quick Reference

| What | Where | Command |
|------|-------|---------|
| Web App | VS Code Terminal | `npm run dev` |
| Train Models | Anaconda (in project folder) | `python ml_models/train_advanced.py` |
| Test Models | Anaconda (in project folder) | `python ml_models/predict_advanced.py` |
| ML API (optional) | Anaconda (in project folder) | `python ml_models/api_server.py` |

**Bottom Line**: After running the Anaconda commands, your ML models are trained and saved. You don't need to do anything else in VS Code - the app already works!

## Project Structure

```
antifraudster/
├── src/                    # React frontend code
│   ├── components/        # Reusable components
│   ├── pages/            # Page components
│   ├── hooks/            # Custom React hooks
│   └── integrations/     # Supabase integration
├── ml_models/             # Machine Learning models
│   ├── train.py          # Train all models
│   ├── predict.py        # Prediction logic
│   ├── api_server.py     # Flask API server
│   └── requirements.txt  # Python dependencies
├── supabase/             # Backend configuration
│   └── functions/        # Edge functions
└── .env                  # Environment variables (auto-configured)
```

## Useful Commands

```bash
# Development
npm run dev              # Start dev server
npm run build           # Build for production
npm run preview         # Preview production build

# Code Quality
npm run lint            # Run linter
npm run type-check      # Check TypeScript types

# Anaconda ML Commands
conda activate fraud_ml  # Activate ML environment
python ml_models/train.py           # Train models
python ml_models/api_server.py      # Start ML API
conda deactivate        # Deactivate environment
```

## Testing the Fraud Detection

1. **Register/Login** to the dashboard
2. Navigate to **Transactions** page
3. View real-time fraud detection alerts
4. Check **Analytics** for fraud patterns
5. Configure **Vendor Settings** for integration

## Support

- Lovable Cloud Backend: Auto-configured, no setup needed
- Authentication: Email/password with auto-confirm enabled
- ML Models: Optional enhancement, rule-based detection works out of the box

## Security Notes

- Never commit `.env` file to public repositories
- Keep API keys secure
- Use environment variables for sensitive data
- Authentication is handled server-side via Lovable Cloud
