# ML Models Integration Guide with XAI

This guide will help you integrate your trained ML models with the fraud detection system and enable Explainable AI (XAI) features.

## Prerequisites

✅ Python 3.8 or higher installed
✅ Trained ML models (run `python ml_models/train.py` if not done yet)
✅ VS Code or another IDE for running Python scripts

## Step 1: Install Python Dependencies

Open a terminal in VS Code and navigate to the project root, then install required packages:

```bash
# Install all dependencies including SHAP for XAI
pip install -r ml_models/requirements.txt
```

This will install:
- Flask & Flask-CORS (API server)
- scikit-learn (ML models)
- pandas & numpy (data processing)
- **SHAP** (Explainable AI - feature importance)
- joblib (model serialization)

## Step 2: Train Your ML Models (If Not Done Yet)

If you haven't trained your models yet:

```bash
cd ml_models
python train.py
```

This will create trained models in `ml_models/trained_models/`:
- `best_model.pkl` - Your best performing fraud detection model
- `scaler.pkl` - Feature scaler
- `metadata.pkl` - Model metadata
- Other model variants (logistic, random_forest, etc.)

## Step 3: Start the ML API Server with XAI

**IMPORTANT**: You must run this in VS Code or your local environment. The ML API server cannot run in the Lovable preview.

```bash
# From project root
python ml_models/api_server.py
```

You should see:
```
============================================================
🤖 Fraud Detection ML API Server with XAI
============================================================
✅ Models loaded successfully!
   Model: random_forest (or your best model)
   Features: 8
✅ SHAP explainer initialized for XAI

🚀 Starting server on http://localhost:8000
   Endpoints:
   - GET  /           : API info
   - POST /predict    : Make fraud prediction with XAI
   - GET  /health     : Health check
   - GET  /model-info : Model information

   ✨ XAI Features:
   - SHAP feature importance
   - Human-readable explanations
   - Risk factor breakdown

   Press CTRL+C to stop
============================================================
```

## Step 4: Test the ML API

Open another terminal and test the API:

```bash
curl http://localhost:8000/
```

You should get a response like:
```json
{
  "status": "ok",
  "message": "Fraud Detection ML API with XAI",
  "model": "random_forest",
  "version": "1.0.0",
  "xai_enabled": true
}
```

Test a prediction with XAI:
```bash
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{
    "features": {
      "amount": 1500,
      "customer_total_transactions": 5,
      "customer_trust_score": 45,
      "customer_average_transaction": 200,
      "hour_of_day": 14,
      "day_of_week": 3,
      "transaction_velocity_1h": 2,
      "location_distance_km": 100
    }
  }'
```

## Step 5: How the System Now Works

### When ML API is Running (localhost:8000):

1. **User checks out** → Frontend sends transaction to backend
2. **Backend edge function** → Calls `ml-predict` edge function
3. **ml-predict function** → Detects ML API at `localhost:8000` and forwards request
4. **Python ML API** → 
   - Loads trained model
   - Scales features
   - Makes prediction
   - **Generates SHAP explanations** (XAI)
   - Returns fraud score + feature importance + explanations
5. **Frontend** → Displays results with ML-powered insights

### XAI (Explainable AI) Features:

The ML API now returns detailed explanations:

```json
{
  "fraud_score": 65,
  "is_fraud": true,
  "probability": 0.65,
  "risk_level": "high",
  "recommendation": "MANUAL_REVIEW",
  "model_used": "random_forest",
  "feature_importance": [
    {
      "feature": "amount",
      "impact": 0.35,
      "value": 1500,
      "shap_value": 0.35
    },
    {
      "feature": "customer_trust_score",
      "impact": 0.25,
      "value": 45,
      "shap_value": -0.25
    }
    // ... more features
  ],
  "explanation": {
    "top_factors": [
      "High amount: 1500",
      "Low customer trust score: 45",
      "High transaction velocity 1h: 2"
    ],
    "summary": "ML model detected high risk based on 3 factors"
  }
}
```

### When ML API is NOT Running:

The system automatically falls back to rule-based fraud detection (no ML predictions).

## Step 6: Configure ML_API_URL (Optional)

If you want to deploy the ML API to a remote server:

1. Deploy the `ml_models/api_server.py` to your server
2. Set the `ML_API_URL` environment variable in Lovable Cloud secrets:
   - Go to Cloud → Secrets
   - Add secret: `ML_API_URL` with value `https://your-ml-api.com`

## Step 7: Verify Integration

1. **Keep ML API running** in VS Code terminal
2. Go to your Lovable app at `http://localhost:5173` or your preview URL
3. Login and go to Shop
4. Add items to cart and proceed to checkout
5. Complete the checkout form
6. **Check VS Code terminal** - you should see prediction requests coming in:

```
Calling ML API at: http://localhost:8000/predict
✅ ML prediction with XAI received: {...}
```

7. In the frontend, you'll see:
   - Fraud alerts with ML-powered scores
   - Risk factor breakdowns
   - SHAP-based feature importance
   - Human-readable explanations

## Understanding XAI (SHAP) Explanations

**SHAP (SHapley Additive exPlanations)** tells you:

- **Which features** contributed most to the fraud score
- **How much impact** each feature had (positive or negative)
- **Why** the model made its decision

Example interpretation:
```
Feature: amount
Impact: 0.35 (high)
SHAP value: +0.35 (positive = increases fraud risk)
Interpretation: "High transaction amount increases fraud probability by 35%"

Feature: customer_trust_score  
Impact: 0.25 (medium)
SHAP value: -0.25 (negative = decreases fraud risk)
Interpretation: "Low customer trust score increases fraud probability by 25%"
```

## Troubleshooting

### "Models not loaded" error
- Run `python ml_models/train.py` first
- Check that `ml_models/trained_models/` directory exists with `.pkl` files

### "Connection refused" or ML API not reachable
- Make sure the ML API server is running: `python ml_models/api_server.py`
- Check that it's running on `http://localhost:8000`
- Verify no firewall is blocking port 8000

### Import errors
- Install missing packages: `pip install -r ml_models/requirements.txt`
- Make sure you're using Python 3.8+

### SHAP errors
- SHAP requires numpy<2.0: `pip install "numpy<2.0"`
- If issues persist, downgrade shap: `pip install shap==0.41.0`

### Low accuracy
- Retrain with more/better data
- Check feature engineering in `train.py`
- Try advanced models: `python ml_models/train_advanced.py`

## Next Steps

1. ✅ Monitor fraud detection accuracy
2. ✅ Collect real transaction data
3. ✅ Retrain models periodically with new data
4. ✅ Analyze SHAP explanations to improve feature engineering
5. ✅ Deploy ML API to production server (optional)

## Production Deployment

For production, you have two options:

### Option 1: Deploy ML API to Cloud Server
- Deploy `api_server.py` to AWS, GCP, or Azure
- Set `ML_API_URL` secret in Lovable Cloud
- Ensure low latency (<200ms) for real-time predictions

### Option 2: Use Serverless ML
- Convert model to ONNX format
- Deploy to AWS Lambda or Google Cloud Functions
- Use edge runtime for faster inference

## Understanding the Currency Change

All prices are now in **Indian Rupees (INR)** instead of USD:
- Product prices: ₹X
- Cart totals: ₹X
- Transaction amounts: stored as INR in database

## Resources

- [SHAP Documentation](https://shap.readthedocs.io/)
- [scikit-learn Model Persistence](https://scikit-learn.org/stable/model_persistence.html)
- [Flask API Development](https://flask.palletsprojects.com/)
- [Fraud Detection Best Practices](https://docs.lovable.dev/)

## Support

If you encounter issues:
1. Check the terminal output from both the ML API and the Lovable app
2. Review the edge function logs in Lovable Cloud
3. Ensure all dependencies are installed
4. Verify the ML API is accessible at `http://localhost:8000`

**Happy fraud detecting with ML + XAI! 🚀🤖✨**
