"""
ML Prediction Helper Script
Test your trained models with sample transactions
"""

import joblib
import numpy as np
import pandas as pd
import os

def load_models():
    """Load trained models and scaler"""
    if not os.path.exists('trained_models/best_model.pkl'):
        print("❌ Error: No trained models found!")
        print("   Please run 'python train.py' first.")
        return None, None, None
    
    model = joblib.load('trained_models/best_model.pkl')
    scaler = joblib.load('trained_models/scaler.pkl')
    metadata = joblib.load('trained_models/metadata.pkl')
    
    return model, scaler, metadata

def predict_fraud(transaction_data):
    """
    Predict fraud for a single transaction
    
    Args:
        transaction_data: dict with keys:
            - amount
            - customer_total_transactions
            - customer_trust_score
            - customer_average_transaction
            - hour_of_day
            - day_of_week
            - transaction_velocity_1h
            - location_distance_km
    
    Returns:
        dict with prediction, probability, and risk_level
    """
    model, scaler, metadata = load_models()
    
    if model is None:
        return None
    
    # Create feature vector
    features = metadata['features']
    X = np.array([[transaction_data[f] for f in features]])
    
    # Scale features
    X_scaled = scaler.transform(X)
    
    # Predict
    prediction = model.predict(X_scaled)[0]
    probability = model.predict_proba(X_scaled)[0][1]
    
    # Convert to fraud score (0-100)
    fraud_score = int(probability * 100)
    
    # Determine risk level
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
    
    return {
        'is_fraud': bool(prediction),
        'fraud_score': fraud_score,
        'probability': float(probability),
        'risk_level': risk_level,
        'recommendation': recommendation,
        'model_used': metadata['best_model']
    }

# Example usage
if __name__ == "__main__":
    print("🤖 Fraud Detection ML Prediction Tool")
    print("=" * 60)
    
    # Test with sample transactions
    test_cases = [
        {
            'name': 'Normal Transaction',
            'data': {
                'amount': 50.0,
                'customer_total_transactions': 25,
                'customer_trust_score': 75.0,
                'customer_average_transaction': 45.0,
                'hour_of_day': 14,
                'day_of_week': 2,
                'transaction_velocity_1h': 1,
                'location_distance_km': 10.0
            }
        },
        {
            'name': 'Suspicious Transaction',
            'data': {
                'amount': 1500.0,
                'customer_total_transactions': 1,
                'customer_trust_score': 25.0,
                'customer_average_transaction': 30.0,
                'hour_of_day': 3,
                'day_of_week': 6,
                'transaction_velocity_1h': 10,
                'location_distance_km': 800.0
            }
        },
        {
            'name': 'Moderate Risk Transaction',
            'data': {
                'amount': 250.0,
                'customer_total_transactions': 5,
                'customer_trust_score': 50.0,
                'customer_average_transaction': 80.0,
                'hour_of_day': 22,
                'day_of_week': 4,
                'transaction_velocity_1h': 4,
                'location_distance_km': 200.0
            }
        }
    ]
    
    for test_case in test_cases:
        print(f"\n📋 Test Case: {test_case['name']}")
        print("-" * 60)
        
        result = predict_fraud(test_case['data'])
        
        if result:
            print(f"   Fraud Score: {result['fraud_score']}/100")
            print(f"   Risk Level: {result['risk_level'].upper()}")
            print(f"   Recommendation: {result['recommendation']}")
            print(f"   Is Fraud: {'YES ⚠️' if result['is_fraud'] else 'NO ✅'}")
            print(f"   Model: {result['model_used']}")
    
    print("\n" + "=" * 60)
    print("💡 Use this script to test your models before deploying!")
