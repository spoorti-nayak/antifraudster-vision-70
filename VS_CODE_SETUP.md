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

## Next Steps - Working with ML Models

After your app is running successfully in VS Code, you can set up the ML models in Anaconda:

### 1. Install Anaconda
Download from: https://www.anaconda.com/download

### 2. Create ML Environment

```bash
# Open Anaconda Prompt and run:
conda create -n fraud_ml python=3.9
conda activate fraud_ml

# Navigate to project folder
cd path/to/your/project

# Install ML dependencies
pip install -r ml_models/requirements.txt
```

### 3. Train ML Models

```bash
# Make sure you're in the fraud_ml environment
conda activate fraud_ml

# Train all models (creates .pkl files)
python ml_models/train.py
```

This will create trained models in `ml_models/` folder:
- `logistic_model.pkl`
- `random_forest_model.pkl`
- `gradient_boosting_model.pkl`
- `svm_model.pkl`
- `naive_bayes_model.pkl`
- `neural_network_model.pkl`
- `scaler.pkl`

### 4. Start ML API Server (Optional - for production)

```bash
# In Anaconda Prompt with fraud_ml environment
python ml_models/api_server.py
```

The ML API will run on `http://localhost:5000`

**Note:** The fraud detection system works with rule-based detection by default. ML models are optional for enhanced accuracy.

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
