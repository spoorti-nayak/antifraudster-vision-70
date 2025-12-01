# 🚀 Starting the ML API Server

## Prerequisites

1. **Install Anaconda** (if not already installed):
   - Download from: https://www.anaconda.com/download
   - Follow installation instructions for your OS

## Step 1: Train the Models

First, train the production ML models with a large dataset (200,000 transactions):

### Windows (Anaconda Prompt):
```bash
conda create -n fraud_ml python=3.10 -y
conda activate fraud_ml
cd path\to\your\project\ml_models
pip install -r requirements.txt
python train_advanced.py
```

### Mac/Linux (Terminal):
```bash
conda create -n fraud_ml python=3.10 -y
conda activate fraud_ml
cd path/to/your/project/ml_models
pip install -r requirements.txt
python train_advanced.py
```

**Training will take 2-5 minutes** and will:
- Generate 200,000 synthetic transactions
- Train 6 production-level ML models (XGBoost, LightGBM, CatBoost, etc.)
- Save the best model to `trained_models/advanced/`
- Display accuracy metrics (expect 90%+ AUC-ROC)

## Step 2: Start the ML API Server

Once training is complete, start the Flask API server:

### Windows:
```bash
conda activate fraud_ml
cd path\to\your\project\ml_models
python api_server.py
```

### Mac/Linux:
```bash
conda activate fraud_ml
cd path/to/your/project/ml_models
python api_server.py
```

You should see:
```
✅ Advanced models loaded successfully
   - Model: ensemble
   - Features: 22
   - Training AUC: 0.9612
 * Running on http://localhost:8000
```

## Step 3: Configure Edge Function

The `ml-predict` edge function will automatically detect the API server at `http://localhost:8000`.

If you need to use a different URL, set the environment variable:
```bash
export ML_API_URL=http://your-server:8000
```

## Step 4: Test the Setup

Run the prediction test script:
```bash
conda activate fraud_ml
python predict_advanced.py
```

This will test the models with sample transactions and show you:
- Fraud probabilities
- Risk levels
- Model performance metrics

## Troubleshooting

### "ModuleNotFoundError: No module named 'sklearn'"
```bash
conda activate fraud_ml
pip install -r requirements.txt
```

### "Model files not found"
You need to run training first:
```bash
python train_advanced.py
```

### "Port 8000 already in use"
Kill the existing process or use a different port:
```bash
# Mac/Linux
lsof -ti:8000 | xargs kill -9

# Windows
netstat -ano | findstr :8000
taskkill /PID <PID> /F
```

### Edge function can't reach ML API
- Make sure the API server is running (`python api_server.py`)
- Check firewall settings
- Verify `ML_API_URL` environment variable
- Check the edge function logs for connection errors

## Production Deployment

For production, you should:

1. **Deploy ML API to a cloud server**:
   - AWS EC2, Google Cloud Compute, Azure VM
   - Use a process manager (gunicorn, systemd)
   - Set up HTTPS with a domain

2. **Update ML_API_URL secret** in Supabase:
   - Go to Project Settings → Edge Functions
   - Add `ML_API_URL` secret with your production URL

3. **Scale ML API**:
   - Use load balancer for multiple instances
   - Add Redis caching for predictions
   - Monitor with logging and metrics

## Quick Commands Reference

```bash
# Activate environment
conda activate fraud_ml

# Train models
python train_advanced.py

# Start API server
python api_server.py

# Test predictions
python predict_advanced.py

# Deactivate when done
conda deactivate
```
