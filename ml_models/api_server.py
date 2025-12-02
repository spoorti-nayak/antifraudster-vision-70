"""
Flask API Server for ML Model Predictions with XAI Support
Serves trained fraud detection models via REST API with SHAP explanations

Usage:
    python api_server.py
    
The server will run on http://localhost:8000
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import numpy as np
import os
import shap
import warnings
warnings.filterwarnings('ignore')

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Load models at startup
MODEL_PATH = 'trained_models/'
model = None
scaler = None
metadata = None
explainer = None

def load_models():
    """Load trained models and scaler"""
    global model, scaler, metadata, explainer
    
    try:
        if not os.path.exists(f'{MODEL_PATH}best_model.pkl'):
            print("⚠️  Warning: Trained models not found!")
            print("   Please run 'python train.py' first.")
            return False
        
        model = joblib.load(f'{MODEL_PATH}best_model.pkl')
        scaler = joblib.load(f'{MODEL_PATH}scaler.pkl')
        metadata = joblib.load(f'{MODEL_PATH}metadata.pkl')
        
        # Initialize SHAP explainer for model interpretability
        # Use a small subset for faster initialization
        X_background = np.random.randn(50, len(metadata['features']))
        X_background_scaled = scaler.transform(X_background)
        
        # Create SHAP explainer based on model type
        if hasattr(model, 'predict_proba'):
            # Tree-based or sklearn models
            explainer = shap.KernelExplainer(model.predict_proba, X_background_scaled)
        else:
            explainer = shap.KernelExplainer(model.predict, X_background_scaled)
        
        print("✅ Models loaded successfully!")
        print(f"   Model: {metadata['best_model']}")
        print(f"   Features: {len(metadata['features'])}")
        print("✅ SHAP explainer initialized for XAI")
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
        'message': 'Fraud Detection ML API with XAI',
        'model': metadata['best_model'] if metadata else 'unknown',
        'version': '1.0.0',
        'xai_enabled': True
    })

@app.route('/predict', methods=['POST'])
def predict():
    """
    Predict fraud for a transaction with XAI explanations
    
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
        "model_used": "random_forest",
        "feature_importance": [
            {"feature": "amount", "impact": 0.25, "value": 150.0},
            ...
        ],
        "explanation": {
            "top_factors": ["High transaction amount", "Low trust score"],
            "shap_values": {...}
        }
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
        
        # Generate SHAP explanations
        shap_values = explainer.shap_values(X_scaled, nsamples=100)
        
        # Handle SHAP output format (can be array or list of arrays)
        if isinstance(shap_values, list):
            # Binary classification - take positive class
            shap_values_for_fraud = shap_values[1][0] if len(shap_values) > 1 else shap_values[0][0]
        else:
            shap_values_for_fraud = shap_values[0]
        
        # Create feature importance with SHAP values
        feature_importance = []
        explanations = []
        
        for i, feature_name in enumerate(required_features):
            impact = abs(float(shap_values_for_fraud[i]))
            feature_value = features_dict[feature_name]
            
            feature_importance.append({
                'feature': feature_name,
                'impact': round(impact, 4),
                'value': feature_value,
                'shap_value': round(float(shap_values_for_fraud[i]), 4)
            })
            
            # Generate human-readable explanations
            if impact > 0.05:  # Only significant features
                if shap_values_for_fraud[i] > 0:
                    explanations.append(f"High {feature_name.replace('_', ' ')}: {feature_value}")
                else:
                    explanations.append(f"Low {feature_name.replace('_', ' ')}: {feature_value}")
        
        # Sort by absolute impact
        feature_importance.sort(key=lambda x: x['impact'], reverse=True)
        
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
            'model_used': metadata['best_model'],
            'feature_importance': feature_importance[:8],  # Top 8 features
            'explanation': {
                'top_factors': explanations[:5],  # Top 5 explanations
                'summary': f"ML model detected {risk_level} risk based on {len(explanations)} factors"
            }
        }
        
        return jsonify(result)
    
    except Exception as e:
        print(f"Error in prediction: {e}")
        import traceback
        traceback.print_exc()
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
        'auc': metadata['results'][metadata['best_model']]['auc'],
        'xai_enabled': True
    })

if __name__ == '__main__':
    print("=" * 60)
    print("🤖 Fraud Detection ML API Server with XAI")
    print("=" * 60)
    
    # Load models at startup
    if load_models():
        print("\n🚀 Starting server on http://localhost:8000")
        print("   Endpoints:")
        print("   - GET  /           : API info")
        print("   - POST /predict    : Make fraud prediction with XAI")
        print("   - GET  /health     : Health check")
        print("   - GET  /model-info : Model information")
        print("\n   ✨ XAI Features:")
        print("   - SHAP feature importance")
        print("   - Human-readable explanations")
        print("   - Risk factor breakdown")
        print("\n   Press CTRL+C to stop")
        print("=" * 60 + "\n")
        
        app.run(host='0.0.0.0', port=8000, debug=False)
    else:
        print("\n❌ Failed to start server. Please train models first:")
        print("   python train.py")
