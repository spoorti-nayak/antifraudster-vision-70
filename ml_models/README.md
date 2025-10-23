# 🤖 Fraud Detection ML Models

This directory contains machine learning models for fraud detection in the payment processing system.

## 📁 Directory Structure

```
ml_models/
├── train.py                    # Main training script
├── predict.py                  # Prediction testing script
├── requirements.txt            # Python dependencies
├── README.md                   # This file
├── notebooks/                  # Jupyter notebooks
│   └── fraud_detection.ipynb   # Interactive ML experimentation
├── datasets/                   # Training data
│   └── fraud_transactions.csv  # Transaction dataset
└── trained_models/             # Saved models (generated after training)
    ├── logistic_model.pkl
    ├── rf_model.pkl
    ├── gb_model.pkl
    ├── best_model.pkl
    ├── scaler.pkl
    └── metadata.pkl
```

## 🚀 Quick Start

### 1. Setup Environment (Anaconda)

**Windows (Anaconda Prompt):**
```bash
conda create -n fraud_ml python=3.10 -y
conda activate fraud_ml
cd path\to\fraud-detection-platform\ml_models
pip install -r requirements.txt
```

**Mac/Linux (Terminal):**
```bash
conda create -n fraud_ml python=3.10 -y
conda activate fraud_ml
cd path/to/fraud-detection-platform/ml_models
pip install -r requirements.txt
```

### 2. Train Models

```bash
python train.py
```

This will:
- Generate synthetic training data (if not exists)
- Train 3 models: Logistic Regression, Random Forest, Gradient Boosting
- Evaluate and compare models
- Save the best model for production use

**Training Output:**
```
🤖 Fraud Detection ML Training Pipeline
========================================
📊 Loading Data: 10,000 transactions
🔧 Feature Engineering: 8 features
✂️  Splitting Data: 8,000 train / 2,000 test
🎓 Training Models...
🏆 Best Model: RANDOM_FOREST (AUC: 0.956)
💾 Saved to trained_models/
```

### 3. Test Predictions

```bash
python predict.py
```

Tests your trained models with sample transactions to verify they work correctly.

### 4. Interactive Experimentation (Jupyter)

```bash
jupyter notebook
# Open notebooks/fraud_detection.ipynb
```

## 📊 Model Features

The models use these 8 features:

| Feature | Description | Example |
|---------|-------------|---------|
| `amount` | Transaction amount | $150.00 |
| `customer_total_transactions` | Total transactions by customer | 25 |
| `customer_trust_score` | Customer reputation (0-100) | 75 |
| `customer_average_transaction` | Average transaction amount | $80.00 |
| `hour_of_day` | Hour of transaction (0-23) | 14 |
| `day_of_week` | Day of week (0=Mon, 6=Sun) | 2 |
| `transaction_velocity_1h` | Transactions in last hour | 3 |
| `location_distance_km` | Distance from usual location | 50 km |

## 🎯 Model Performance

After training, you'll see results like:

```
Model              Accuracy    AUC-ROC
─────────────────────────────────────
Logistic Reg       92.5%       0.948
Random Forest      94.8%       0.956
Gradient Boost     93.2%       0.951
```

## 🔄 Integration with Backend

### Current Setup (Rule-Based)
```
Transaction → Edge Function → Rule-based detection → Response
```

### After ML Integration
```
Transaction → Edge Function → Rules (40%) + ML Model (60%) → Response
```

### To Deploy ML Models:

1. **Train models locally** (Anaconda):
   ```bash
   python train.py
   ```

2. **Update Edge Function** (`supabase/functions/ml-predict/index.ts`):
   - Use the Python API server (Option A)
   - Or integrate models directly (Option B)

3. **Update analyze-transaction** to call ML predictions

## 🔧 Using Your Own Data

Replace the synthetic data with real transaction data:

1. **Export from Supabase:**
   ```sql
   SELECT 
     amount,
     customer_total_transactions,
     customer_trust_score,
     customer_average_transaction,
     EXTRACT(HOUR FROM created_at) as hour_of_day,
     EXTRACT(DOW FROM created_at) as day_of_week,
     -- Add velocity and distance calculations
     fraud_score > 60 as is_fraud
   FROM transactions
   WHERE created_at > NOW() - INTERVAL '3 months'
   ```

2. **Save to** `datasets/fraud_transactions.csv`

3. **Retrain:**
   ```bash
   python train.py
   ```

## 📈 Monitoring & Retraining

**Best Practices:**
- Retrain weekly/monthly with new data
- Monitor model accuracy over time
- A/B test new models before full deployment
- Keep fraud score distributions balanced

## 🆘 Troubleshooting

**Error: `ModuleNotFoundError: No module named 'sklearn'`**
```bash
conda activate fraud_ml
pip install -r requirements.txt
```

**Error: `FileNotFoundError: datasets/fraud_transactions.csv`**
- The script auto-generates synthetic data on first run
- Or add your own CSV file to `datasets/`

**Low Model Accuracy (<80%)**
- Need more training data
- Check for data quality issues
- Try hyperparameter tuning

## 🌐 Resources

- [Scikit-learn Documentation](https://scikit-learn.org/)
- [Fraud Detection Best Practices](https://stripe.com/guides/fraud-detection)
- [ML Model Deployment Guide](https://docs.lovable.dev)

## 📞 Support

Questions? Issues? Open a GitHub issue or contact the team!
