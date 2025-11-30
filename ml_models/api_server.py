"""
Flask API Server for ML Model Predictions
Serves trained fraud detection models via REST API

Usage:
    python api_server.py
    
The server will run on http://localhost:8000
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import numpy as np
import os

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Load models at startup
MODEL_PATH = 'trained_models/advanced/'
model = None
scaler = None
metadata = None

def load_models():
    """Load trained models and scaler"""
    global model, scaler, metadata
    
    try:
        if not os.path.exists(f'{MODEL_PATH}best_model.pkl'):
            print("⚠️  Warning: Trained models not found!")
            print("   Please run 'python train.py' first.")
            return False
        
        model = joblib.load(f'{MODEL_PATH}best_model.pkl')
        scaler = joblib.load(f'{MODEL_PATH}scaler.pkl')
        metadata = joblib.load(f'{MODEL_PATH}metadata.pkl')
        
        print("✅ Models loaded successfully!")
        print(f"   Model: {metadata['best_model']}")
        print(f"   Features: {len(metadata['features'])}")
        return True
    except Exception as e:
        print(f"❌ Error loading models: {e}")
        return False

@app.route('/')
def home():
    """Health check endpoint"""
    if model is None:
        return jsonify({
            'status': 'error',
            'message': 'Models not loaded. Please train models first.'
        }), 503
    
    return jsonify({
        'status': 'ok',
        'message': 'Fraud Detection ML API',
        'model': metadata['best_model'] if metadata else 'unknown',
        'version': '1.0.0'
    })

@app.route('/predict', methods=['POST'])
def predict():
    """
    Predict fraud for a transaction
    
    Request body:
    {
        "features": {
            "amount": 150.0,
            "customer_total_transactions": 10,
            "customer_trust_score": 65.0,
            "customer_average_transaction": 80.0,
            "hour_of_day": 14,
            "day_of_week": 2,
            "transaction_velocity_1h": 2,
            "location_distance_km": 50.0
        }
    }
    
    Response:
    {
        "fraud_score": 35,
        "is_fraud": false,
        "probability": 0.35,
        "risk_level": "low",
        "recommendation": "APPROVE_PAYMENT",
        "model_used": "random_forest"
    }
    """
    if model is None:
        return jsonify({
            'error': 'Models not loaded. Please train models first.'
        }), 503
    
    try:
        data = request.get_json()
        features_dict = data.get('features', {})
        
        # Validate features
        required_features = metadata['features']
        missing_features = [f for f in required_features if f not in features_dict]
        
        if missing_features:
            return jsonify({
                'error': f'Missing required features: {missing_features}'
            }), 400
        
        # Create feature vector in correct order
        X = np.array([[features_dict[f] for f in required_features]])
        
        # Scale features
        X_scaled = scaler.transform(X)
        
        # Make prediction
        prediction = model.predict(X_scaled)[0]
        probability = model.predict_proba(X_scaled)[0][1]
        
        # Convert to fraud score (0-100)
        fraud_score = int(probability * 100)
        
        # Determine risk level and recommendation
        if fraud_score >= 80:
            risk_level = 'critical'
            recommendation = 'BLOCK_PAYMENT'
        elif fraud_score >= 60:
            risk_level = 'high'
            recommendation = 'MANUAL_REVIEW'
        elif fraud_score >= 40:
            risk_level = 'medium'
            recommendation = 'MONITOR'
        else:
            risk_level = 'low'
            recommendation = 'APPROVE_PAYMENT'
        
        result = {
            'fraud_score': fraud_score,
            'is_fraud': bool(prediction),
            'probability': float(probability),
            'risk_level': risk_level,
            'recommendation': recommendation,
            'model_used': metadata['best_model']
        }
        
        return jsonify(result)
    
    except Exception as e:
        return jsonify({
            'error': str(e)
        }), 500

@app.route('/health', methods=['GET'])
def health():
    """Health check for load balancers"""
    if model is None:
        return jsonify({'status': 'unhealthy'}), 503
    return jsonify({'status': 'healthy'})

@app.route('/model-info', methods=['GET'])
def model_info():
    """Get information about loaded models"""
    if model is None or metadata is None:
        return jsonify({'error': 'Models not loaded'}), 503
    
    return jsonify({
        'model_type': metadata['best_model'],
        'features': metadata['features'],
        'training_samples': metadata['training_samples'],
        'test_samples': metadata['test_samples'],
        'accuracy': metadata['results'][metadata['best_model']]['accuracy'],
        'auc': metadata['results'][metadata['best_model']]['auc']
    })

if __name__ == '__main__':
    print("=" * 60)
    print("🤖 Fraud Detection ML API Server")
    print("=" * 60)
    
    # Load models at startup
    if load_models():
        print("\n🚀 Starting server on http://localhost:8000")
        print("   Endpoints:")
        print("   - GET  /           : API info")
        print("   - POST /predict    : Make fraud prediction")
        print("   - GET  /health     : Health check")
        print("   - GET  /model-info : Model information")
        print("\n   Press CTRL+C to stop")
        print("=" * 60 + "\n")
        
        app.run(host='0.0.0.0', port=8000, debug=False)
    else:
        print("\n❌ Failed to start server. Please train models first:")
        print("   python train.py")
