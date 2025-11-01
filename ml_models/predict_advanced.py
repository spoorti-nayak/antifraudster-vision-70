"""
Advanced Prediction Script for Production Models
Tests the trained advanced models on sample transactions
"""

import joblib
import numpy as np
import pandas as pd
import os

try:
    from tensorflow import keras
    HAS_KERAS = True
except ImportError:
    HAS_KERAS = False

print("=" * 80)
print("🔮 Advanced Fraud Detection - Prediction Testing")
print("=" * 80)

# Load metadata
metadata = joblib.load('trained_models/advanced/metadata.pkl')
best_model_name = metadata['best_model']
features = metadata['features']

print(f"\n📊 Model Information:")
print(f"   - Best Model: {best_model_name.upper()}")
print(f"   - Features: {len(features)}")
print(f"   - Trained: {metadata['timestamp']}")
print(f"   - Training AUC: {metadata['results'][best_model_name]['auc']:.4f}")

# Load scaler
scaler = joblib.load('trained_models/advanced/scaler.pkl')

# Load best model
print(f"\n⏳ Loading {best_model_name} model...")
if best_model_name == 'deep_nn' and HAS_KERAS:
    model = keras.models.load_model('trained_models/advanced/best_model.h5')
else:
    model = joblib.load('trained_models/advanced/best_model.pkl')
print("✅ Model loaded successfully")

# Test cases
print("\n" + "=" * 80)
print("🧪 Testing Sample Transactions")
print("=" * 80)

test_cases = [
    {
        'name': 'Normal Transaction - Regular Customer',
        'data': {
            'amount': 45.99,
            'customer_total_transactions': 127,
            'customer_trust_score': 85,
            'customer_average_transaction': 52.30,
            'hour_of_day': 14,
            'day_of_week': 2,
            'transaction_velocity_1h': 1,
            'transaction_velocity_24h': 3,
            'location_distance_km': 5.2,
            'device_trust_score': 90,
            'email_age_days': 823,
            'account_age_days': 950,
            'failed_login_attempts': 0,
            'shipping_billing_match': 1,
            'ip_country_match': 1,
            'is_weekend': 0
        },
        'expected': 'SAFE'
    },
    {
        'name': 'Suspicious Transaction - High Amount, New Customer',
        'data': {
            'amount': 1299.99,
            'customer_total_transactions': 2,
            'customer_trust_score': 25,
            'customer_average_transaction': 800.00,
            'hour_of_day': 2,
            'day_of_week': 6,
            'transaction_velocity_1h': 3,
            'transaction_velocity_24h': 5,
            'location_distance_km': 1523.4,
            'device_trust_score': 15,
            'email_age_days': 3,
            'account_age_days': 1,
            'failed_login_attempts': 5,
            'shipping_billing_match': 0,
            'ip_country_match': 0,
            'is_weekend': 1
        },
        'expected': 'FRAUD'
    },
    {
        'name': 'Medium Risk - New Account, Normal Amount',
        'data': {
            'amount': 89.99,
            'customer_total_transactions': 5,
            'customer_trust_score': 50,
            'customer_average_transaction': 75.00,
            'hour_of_day': 18,
            'day_of_week': 3,
            'transaction_velocity_1h': 2,
            'transaction_velocity_24h': 4,
            'location_distance_km': 250.0,
            'device_trust_score': 60,
            'email_age_days': 45,
            'account_age_days': 30,
            'failed_login_attempts': 1,
            'shipping_billing_match': 1,
            'ip_country_match': 0,
            'is_weekend': 0
        },
        'expected': 'SUSPICIOUS'
    },
    {
        'name': 'High Velocity Attack',
        'data': {
            'amount': 499.99,
            'customer_total_transactions': 1,
            'customer_trust_score': 10,
            'customer_average_transaction': 499.99,
            'hour_of_day': 3,
            'day_of_week': 1,
            'transaction_velocity_1h': 15,
            'transaction_velocity_24h': 30,
            'location_distance_km': 3200.0,
            'device_trust_score': 5,
            'email_age_days': 1,
            'account_age_days': 0,
            'failed_login_attempts': 8,
            'shipping_billing_match': 0,
            'ip_country_match': 0,
            'is_weekend': 0
        },
        'expected': 'FRAUD'
    }
]

for i, test_case in enumerate(test_cases, 1):
    print(f"\n{'='*80}")
    print(f"Test Case {i}: {test_case['name']}")
    print(f"Expected: {test_case['expected']}")
    print(f"{'='*80}")
    
    # Create DataFrame from test data
    df_test = pd.DataFrame([test_case['data']])
    
    # Engineer derived features (same as training)
    df_test['amount_velocity_ratio'] = df_test['amount'] / (df_test['transaction_velocity_24h'] + 1)
    df_test['trust_score_combined'] = (df_test['customer_trust_score'] + df_test['device_trust_score']) / 2
    df_test['account_email_age_ratio'] = df_test['account_age_days'] / (df_test['email_age_days'] + 1)
    df_test['is_night_transaction'] = ((df_test['hour_of_day'] >= 22) | (df_test['hour_of_day'] <= 5)).astype(int)
    df_test['location_risk_score'] = df_test['location_distance_km'] * (1 - df_test['ip_country_match'])
    df_test['velocity_score'] = df_test['transaction_velocity_1h'] * 10 + df_test['transaction_velocity_24h']
    
    # Get features in correct order
    X_test = df_test[features]
    
    # Scale features
    X_test_scaled = scaler.transform(X_test)
    
    # Make prediction
    if best_model_name == 'isolation_forest':
        score = model.decision_function(X_test_scaled)[0]
        fraud_probability = 1 / (1 + np.exp(score))
    elif best_model_name == 'deep_nn':
        fraud_probability = float(model.predict(X_test_scaled, verbose=0)[0][0])
    else:
        fraud_probability = model.predict_proba(X_test_scaled)[0][1]
    
    # Determine risk level
    if fraud_probability >= 0.7:
        risk_level = "🚨 HIGH RISK - FRAUD"
        risk_color = "RED"
    elif fraud_probability >= 0.4:
        risk_level = "⚠️  MEDIUM RISK - REVIEW"
        risk_color = "YELLOW"
    else:
        risk_level = "✅ LOW RISK - SAFE"
        risk_color = "GREEN"
    
    print(f"\n📊 Prediction Results:")
    print(f"   Fraud Probability: {fraud_probability:.2%}")
    print(f"   Risk Level: {risk_level}")
    print(f"   Confidence: {max(fraud_probability, 1-fraud_probability):.2%}")
    
    # Show key risk factors
    print(f"\n🔍 Key Transaction Details:")
    print(f"   Amount: ${test_case['data']['amount']:.2f}")
    print(f"   Customer Transactions: {test_case['data']['customer_total_transactions']}")
    print(f"   Trust Score: {test_case['data']['customer_trust_score']}/100")
    print(f"   Device Trust: {test_case['data']['device_trust_score']}/100")
    print(f"   Velocity (1h): {test_case['data']['transaction_velocity_1h']} txns")
    print(f"   Account Age: {test_case['data']['account_age_days']} days")
    print(f"   Location Distance: {test_case['data']['location_distance_km']:.1f} km")

print("\n" + "=" * 80)
print("✅ Testing Complete")
print("=" * 80)
print("\n💡 Model Performance Summary:")
print(f"   - Model: {best_model_name.upper()}")
print(f"   - Accuracy: {metadata['results'][best_model_name].get('accuracy', 'N/A')}")
print(f"   - AUC-ROC: {metadata['results'][best_model_name]['auc']:.4f}")

print("\n🚀 Ready for Production Deployment!")
print("\n📝 Integration Steps:")
print("   1. Copy trained_models/advanced/ to production server")
print("   2. Update ml-predict Edge Function to use advanced models")
print("   3. Configure fraud_probability thresholds in production")
print("   4. Enable real-time monitoring and alerting")
