"""
Advanced Production-Level Fraud Detection ML Training Pipeline
Implements state-of-the-art models and techniques for 90%+ accuracy
"""

import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split, cross_val_score, StratifiedKFold
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier, VotingClassifier, StackingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler, RobustScaler
from sklearn.metrics import classification_report, confusion_matrix, roc_auc_score, precision_recall_curve, f1_score
from sklearn.svm import SVC
from sklearn.naive_bayes import GaussianNB
from sklearn.neural_network import MLPClassifier
from sklearn.ensemble import IsolationForest
from sklearn.tree import DecisionTreeClassifier
import joblib
import os
from datetime import datetime
import warnings
warnings.filterwarnings('ignore')

# Advanced Models
try:
    import xgboost as xgb
    HAS_XGBOOST = True
except ImportError:
    HAS_XGBOOST = False
    print("⚠️  XGBoost not installed. Install with: pip install xgboost")

try:
    import lightgbm as lgb
    HAS_LIGHTGBM = True
except ImportError:
    HAS_LIGHTGBM = False
    print("⚠️  LightGBM not installed. Install with: pip install lightgbm")

try:
    from catboost import CatBoostClassifier
    HAS_CATBOOST = True
except ImportError:
    HAS_CATBOOST = False
    print("⚠️  CatBoost not installed. Install with: pip install catboost")

try:
    from imblearn.over_sampling import SMOTE
    from imblearn.under_sampling import RandomUnderSampler
    from imblearn.pipeline import Pipeline as ImbPipeline
    HAS_IMBLEARN = True
except ImportError:
    HAS_IMBLEARN = False
    print("⚠️  imbalanced-learn not installed. Install with: pip install imbalanced-learn")

try:
    from tensorflow import keras
    from tensorflow.keras import layers
    HAS_KERAS = True
except ImportError:
    HAS_KERAS = False
    print("⚠️  TensorFlow/Keras not installed. Install with: pip install tensorflow")

# Create directories
os.makedirs('trained_models', exist_ok=True)
os.makedirs('datasets', exist_ok=True)
os.makedirs('trained_models/advanced', exist_ok=True)

print("=" * 80)
print("🚀 ADVANCED PRODUCTION-LEVEL FRAUD DETECTION ML PIPELINE")
print("=" * 80)
print("Target: 90%+ Accuracy with State-of-the-Art Models")
print("=" * 80)

# ============================================================================
# STEP 1: LOAD OR GENERATE ENHANCED TRAINING DATA
# ============================================================================
print("\n📊 STEP 1: Loading Enhanced Training Data...")

if not os.path.exists('datasets/fraud_transactions_advanced.csv'):
    print("⚠️  No advanced dataset found. Generating enhanced synthetic data...")
    
    np.random.seed(42)
    n_samples = 200000  # Huge dataset for production-level accuracy
    
    # Normal transactions (92% - realistic fraud rate)
    n_normal = int(n_samples * 0.92)
    normal_data = {
        'amount': np.random.exponential(100, n_normal),
        'customer_total_transactions': np.random.poisson(25, n_normal),
        'customer_trust_score': np.random.normal(75, 12, n_normal),
        'customer_average_transaction': np.random.exponential(85, n_normal),
        'hour_of_day': np.random.randint(6, 23, n_normal),
        'day_of_week': np.random.randint(0, 7, n_normal),
        'transaction_velocity_1h': np.random.poisson(2, n_normal),
        'transaction_velocity_24h': np.random.poisson(5, n_normal),
        'location_distance_km': np.random.exponential(30, n_normal),
        'device_trust_score': np.random.normal(80, 10, n_normal),
        'email_age_days': np.random.exponential(365, n_normal),
        'account_age_days': np.random.exponential(400, n_normal),
        'failed_login_attempts': np.random.poisson(0.5, n_normal),
        'shipping_billing_match': np.random.choice([0, 1], n_normal, p=[0.1, 0.9]),
        'ip_country_match': np.random.choice([0, 1], n_normal, p=[0.05, 0.95]),
        'is_weekend': (np.random.randint(0, 7, n_normal) >= 5).astype(int),
        'is_fraud': 0
    }
    
    # Fraudulent transactions (8%)
    n_fraud = n_samples - n_normal
    fraud_data = {
        'amount': np.random.exponential(600, n_fraud),  # Higher amounts
        'customer_total_transactions': np.random.poisson(1, n_fraud),  # New customers
        'customer_trust_score': np.random.normal(25, 15, n_fraud),  # Low trust
        'customer_average_transaction': np.random.exponential(40, n_fraud),
        'hour_of_day': np.random.choice([1, 2, 3, 4, 22, 23], n_fraud),  # Unusual hours
        'day_of_week': np.random.randint(0, 7, n_fraud),
        'transaction_velocity_1h': np.random.poisson(10, n_fraud),  # High velocity
        'transaction_velocity_24h': np.random.poisson(25, n_fraud),
        'location_distance_km': np.random.exponential(800, n_fraud),  # Far locations
        'device_trust_score': np.random.normal(30, 15, n_fraud),  # Untrusted devices
        'email_age_days': np.random.exponential(30, n_fraud),  # New emails
        'account_age_days': np.random.exponential(15, n_fraud),  # New accounts
        'failed_login_attempts': np.random.poisson(3, n_fraud),  # Multiple failures
        'shipping_billing_match': np.random.choice([0, 1], n_fraud, p=[0.7, 0.3]),  # Mismatch
        'ip_country_match': np.random.choice([0, 1], n_fraud, p=[0.6, 0.4]),  # Different country
        'is_weekend': (np.random.randint(0, 7, n_fraud) >= 5).astype(int),
        'is_fraud': 1
    }
    
    # Combine and shuffle
    df_normal = pd.DataFrame(normal_data)
    df_fraud = pd.DataFrame(fraud_data)
    df = pd.concat([df_normal, df_fraud], ignore_index=True)
    df = df.sample(frac=1, random_state=42).reset_index(drop=True)
    
    # Clip values to realistic ranges
    df['customer_trust_score'] = df['customer_trust_score'].clip(0, 100)
    df['device_trust_score'] = df['device_trust_score'].clip(0, 100)
    df['hour_of_day'] = df['hour_of_day'].clip(0, 23)
    df['email_age_days'] = df['email_age_days'].clip(0, 3650)
    df['account_age_days'] = df['account_age_days'].clip(0, 3650)
    
    # Save dataset
    df.to_csv('datasets/fraud_transactions_advanced.csv', index=False)
    print(f"✅ Generated {n_samples} enhanced synthetic transactions")
else:
    df = pd.read_csv('datasets/fraud_transactions_advanced.csv')
    print(f"✅ Loaded {len(df)} transactions from advanced dataset")

print(f"   📈 Normal transactions: {(df['is_fraud'] == 0).sum()}")
print(f"   🚨 Fraudulent transactions: {(df['is_fraud'] == 1).sum()}")
print(f"   📊 Fraud rate: {df['is_fraud'].mean():.2%}")

# ============================================================================
# STEP 2: ADVANCED FEATURE ENGINEERING
# ============================================================================
print("\n🔧 STEP 2: Advanced Feature Engineering...")

# Create derived features
df['amount_velocity_ratio'] = df['amount'] / (df['transaction_velocity_24h'] + 1)
df['trust_score_combined'] = (df['customer_trust_score'] + df['device_trust_score']) / 2
df['account_email_age_ratio'] = df['account_age_days'] / (df['email_age_days'] + 1)
df['is_night_transaction'] = ((df['hour_of_day'] >= 22) | (df['hour_of_day'] <= 5)).astype(int)
df['location_risk_score'] = df['location_distance_km'] * (1 - df['ip_country_match'])
df['velocity_score'] = df['transaction_velocity_1h'] * 10 + df['transaction_velocity_24h']

features = [
    # Original features
    'amount',
    'customer_total_transactions',
    'customer_trust_score',
    'customer_average_transaction',
    'hour_of_day',
    'day_of_week',
    'transaction_velocity_1h',
    'transaction_velocity_24h',
    'location_distance_km',
    'device_trust_score',
    'email_age_days',
    'account_age_days',
    'failed_login_attempts',
    'shipping_billing_match',
    'ip_country_match',
    'is_weekend',
    # Engineered features
    'amount_velocity_ratio',
    'trust_score_combined',
    'account_email_age_ratio',
    'is_night_transaction',
    'location_risk_score',
    'velocity_score'
]

X = df[features]
y = df['is_fraud']

print(f"✅ Using {len(features)} features (including {6} engineered features)")

# ============================================================================
# STEP 3: TRAIN-TEST SPLIT WITH STRATIFICATION
# ============================================================================
print("\n✂️  STEP 3: Splitting Data with Stratification...")
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)
print(f"✅ Train set: {len(X_train)} samples (Fraud: {y_train.sum()}, {y_train.mean():.2%})")
print(f"✅ Test set: {len(X_test)} samples (Fraud: {y_test.sum()}, {y_test.mean():.2%})")

# ============================================================================
# STEP 4: HANDLE IMBALANCED DATA WITH SMOTE
# ============================================================================
print("\n⚖️  STEP 4: Handling Imbalanced Data...")
if HAS_IMBLEARN:
    smote = SMOTE(random_state=42, k_neighbors=5)
    X_train_balanced, y_train_balanced = smote.fit_resample(X_train, y_train)
    print(f"✅ Applied SMOTE - Train samples increased: {len(X_train)} → {len(X_train_balanced)}")
    print(f"   - New fraud rate: {y_train_balanced.mean():.2%}")
else:
    X_train_balanced = X_train
    y_train_balanced = y_train
    print("⚠️  SMOTE not available, using original imbalanced data")

# ============================================================================
# STEP 5: FEATURE SCALING
# ============================================================================
print("\n📏 STEP 5: Robust Feature Scaling...")
scaler = RobustScaler()  # More robust to outliers than StandardScaler
X_train_scaled = scaler.fit_transform(X_train_balanced)
X_test_scaled = scaler.transform(X_test)
print("✅ Features scaled using RobustScaler (resistant to outliers)")

# ============================================================================
# STEP 6: TRAIN PRODUCTION-LEVEL MODELS
# ============================================================================
print("\n🎓 STEP 6: Training Production-Level Models...")
print("=" * 80)

models = {}
results = {}

# Model 1: XGBoost (Often best for tabular data)
if HAS_XGBOOST:
    print("\n1️⃣  Training XGBoost (Extreme Gradient Boosting)...")
    xgb_model = xgb.XGBClassifier(
        n_estimators=200,
        max_depth=6,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        random_state=42,
        eval_metric='logloss',
        scale_pos_weight=(len(y_train_balanced) - y_train_balanced.sum()) / y_train_balanced.sum()
    )
    xgb_model.fit(X_train_scaled, y_train_balanced)
    xgb_proba = xgb_model.predict_proba(X_test_scaled)[:, 1]
    models['xgboost'] = xgb_model
    results['xgboost'] = {
        'accuracy': xgb_model.score(X_test_scaled, y_test),
        'auc': roc_auc_score(y_test, xgb_proba),
        'f1': f1_score(y_test, xgb_model.predict(X_test_scaled))
    }
    print(f"   ✅ Accuracy: {results['xgboost']['accuracy']:.2%}")
    print(f"   ✅ AUC-ROC: {results['xgboost']['auc']:.4f}")
    print(f"   ✅ F1-Score: {results['xgboost']['f1']:.4f}")

# Model 2: LightGBM (Fast and efficient)
if HAS_LIGHTGBM:
    print("\n2️⃣  Training LightGBM (Light Gradient Boosting)...")
    lgb_model = lgb.LGBMClassifier(
        n_estimators=200,
        max_depth=6,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        random_state=42,
        is_unbalance=True,
        verbose=-1
    )
    lgb_model.fit(X_train_scaled, y_train_balanced)
    lgb_proba = lgb_model.predict_proba(X_test_scaled)[:, 1]
    models['lightgbm'] = lgb_model
    results['lightgbm'] = {
        'accuracy': lgb_model.score(X_test_scaled, y_test),
        'auc': roc_auc_score(y_test, lgb_proba),
        'f1': f1_score(y_test, lgb_model.predict(X_test_scaled))
    }
    print(f"   ✅ Accuracy: {results['lightgbm']['accuracy']:.2%}")
    print(f"   ✅ AUC-ROC: {results['lightgbm']['auc']:.4f}")
    print(f"   ✅ F1-Score: {results['lightgbm']['f1']:.4f}")

# Model 3: CatBoost (Handles categorical features well)
if HAS_CATBOOST:
    print("\n3️⃣  Training CatBoost...")
    cat_model = CatBoostClassifier(
        iterations=200,
        depth=6,
        learning_rate=0.05,
        random_state=42,
        verbose=0,
        auto_class_weights='Balanced'
    )
    cat_model.fit(X_train_scaled, y_train_balanced)
    cat_proba = cat_model.predict_proba(X_test_scaled)[:, 1]
    models['catboost'] = cat_model
    results['catboost'] = {
        'accuracy': cat_model.score(X_test_scaled, y_test),
        'auc': roc_auc_score(y_test, cat_proba),
        'f1': f1_score(y_test, cat_model.predict(X_test_scaled))
    }
    print(f"   ✅ Accuracy: {results['catboost']['accuracy']:.2%}")
    print(f"   ✅ AUC-ROC: {results['catboost']['auc']:.4f}")
    print(f"   ✅ F1-Score: {results['catboost']['f1']:.4f}")

# Model 4: Isolation Forest (Anomaly Detection)
print("\n4️⃣  Training Isolation Forest (Anomaly Detection)...")
iso_model = IsolationForest(
    n_estimators=100,
    contamination=float(y_train.mean()),
    random_state=42,
    n_jobs=-1
)
iso_model.fit(X_train_scaled)
iso_scores = iso_model.decision_function(X_test_scaled)
# Convert scores to probabilities (lower score = more anomalous)
iso_proba = 1 / (1 + np.exp(iso_scores))
models['isolation_forest'] = iso_model
results['isolation_forest'] = {
    'auc': roc_auc_score(y_test, iso_proba)
}
print(f"   ✅ AUC-ROC: {results['isolation_forest']['auc']:.4f}")

# Model 5: Advanced Neural Network (Deep Learning)
if HAS_KERAS:
    print("\n5️⃣  Training Deep Neural Network...")
    nn_keras_model = keras.Sequential([
        layers.Dense(128, activation='relu', input_shape=(X_train_scaled.shape[1],)),
        layers.Dropout(0.3),
        layers.BatchNormalization(),
        layers.Dense(64, activation='relu'),
        layers.Dropout(0.2),
        layers.BatchNormalization(),
        layers.Dense(32, activation='relu'),
        layers.Dropout(0.1),
        layers.Dense(16, activation='relu'),
        layers.Dense(1, activation='sigmoid')
    ])
    
    nn_keras_model.compile(
        optimizer=keras.optimizers.Adam(learning_rate=0.001),
        loss='binary_crossentropy',
        metrics=['accuracy', keras.metrics.AUC(name='auc')]
    )
    
    # Class weights for imbalanced data
    class_weight = {
        0: 1.0,
        1: (len(y_train) - y_train.sum()) / y_train.sum()
    }
    
    nn_keras_model.fit(
        X_train_scaled, y_train_balanced,
        epochs=50,
        batch_size=32,
        validation_split=0.2,
        class_weight=class_weight,
        verbose=0
    )
    
    nn_proba = nn_keras_model.predict(X_test_scaled, verbose=0).flatten()
    nn_pred = (nn_proba > 0.5).astype(int)
    models['deep_nn'] = nn_keras_model
    results['deep_nn'] = {
        'accuracy': (nn_pred == y_test).mean(),
        'auc': roc_auc_score(y_test, nn_proba),
        'f1': f1_score(y_test, nn_pred)
    }
    print(f"   ✅ Accuracy: {results['deep_nn']['accuracy']:.2%}")
    print(f"   ✅ AUC-ROC: {results['deep_nn']['auc']:.4f}")
    print(f"   ✅ F1-Score: {results['deep_nn']['f1']:.4f}")

# Model 6: Random Forest (Ensemble baseline)
print("\n6️⃣  Training Optimized Random Forest...")
rf_model = RandomForestClassifier(
    n_estimators=200,
    max_depth=15,
    min_samples_split=5,
    min_samples_leaf=2,
    random_state=42,
    n_jobs=-1,
    class_weight='balanced'
)
rf_model.fit(X_train_scaled, y_train_balanced)
rf_proba = rf_model.predict_proba(X_test_scaled)[:, 1]
models['random_forest'] = rf_model
results['random_forest'] = {
    'accuracy': rf_model.score(X_test_scaled, y_test),
    'auc': roc_auc_score(y_test, rf_proba),
    'f1': f1_score(y_test, rf_model.predict(X_test_scaled))
}
print(f"   ✅ Accuracy: {results['random_forest']['accuracy']:.2%}")
print(f"   ✅ AUC-ROC: {results['random_forest']['auc']:.4f}")
print(f"   ✅ F1-Score: {results['random_forest']['f1']:.4f}")

# ============================================================================
# STEP 7: CREATE ENSEMBLE MODEL (Voting Classifier)
# ============================================================================
print("\n🎯 STEP 7: Creating Ensemble Model (Voting)...")

ensemble_estimators = []
if HAS_XGBOOST:
    ensemble_estimators.append(('xgb', models['xgboost']))
if HAS_LIGHTGBM:
    ensemble_estimators.append(('lgb', models['lightgbm']))
if HAS_CATBOOST:
    ensemble_estimators.append(('cat', models['catboost']))
ensemble_estimators.append(('rf', models['random_forest']))

if len(ensemble_estimators) >= 2:
    ensemble_model = VotingClassifier(
        estimators=ensemble_estimators,
        voting='soft'  # Use probability averaging
    )
    ensemble_model.fit(X_train_scaled, y_train_balanced)
    ensemble_proba = ensemble_model.predict_proba(X_test_scaled)[:, 1]
    models['ensemble'] = ensemble_model
    results['ensemble'] = {
        'accuracy': ensemble_model.score(X_test_scaled, y_test),
        'auc': roc_auc_score(y_test, ensemble_proba),
        'f1': f1_score(y_test, ensemble_model.predict(X_test_scaled))
    }
    print(f"✅ Ensemble Model created with {len(ensemble_estimators)} models")
    print(f"   ✅ Accuracy: {results['ensemble']['accuracy']:.2%}")
    print(f"   ✅ AUC-ROC: {results['ensemble']['auc']:.4f}")
    print(f"   ✅ F1-Score: {results['ensemble']['f1']:.4f}")

# ============================================================================
# STEP 8: SELECT BEST MODEL
# ============================================================================
print("\n🏆 STEP 8: Selecting Best Model Based on AUC-ROC...")
best_model_name = max(results, key=lambda x: results[x]['auc'])
best_model = models[best_model_name]
print(f"✅ BEST MODEL: {best_model_name.upper()}")
print(f"   📊 AUC-ROC: {results[best_model_name]['auc']:.4f}")
if 'accuracy' in results[best_model_name]:
    print(f"   📊 Accuracy: {results[best_model_name]['accuracy']:.2%}")
if 'f1' in results[best_model_name]:
    print(f"   📊 F1-Score: {results[best_model_name]['f1']:.4f}")

# ============================================================================
# STEP 9: SAVE ALL MODELS
# ============================================================================
print("\n💾 STEP 9: Saving Production Models...")
timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

for model_name, model in models.items():
    if model_name == 'deep_nn' and HAS_KERAS:
        model.save(f'trained_models/advanced/{model_name}_model.h5')
    else:
        joblib.dump(model, f'trained_models/advanced/{model_name}_model.pkl')
    print(f"   ✅ Saved: {model_name}_model")

# Save scaler
joblib.dump(scaler, 'trained_models/advanced/scaler.pkl')

# Save best model separately
if best_model_name == 'deep_nn' and HAS_KERAS:
    best_model.save('trained_models/advanced/best_model.h5')
else:
    joblib.dump(best_model, 'trained_models/advanced/best_model.pkl')

# Save comprehensive metadata
metadata = {
    'timestamp': timestamp,
    'best_model': best_model_name,
    'features': features,
    'feature_count': len(features),
    'results': results,
    'training_samples': len(X_train_balanced),
    'test_samples': len(X_test),
    'original_fraud_rate': y_train.mean(),
    'balanced_fraud_rate': y_train_balanced.mean(),
    'smote_applied': HAS_IMBLEARN,
    'models_trained': list(models.keys())
}
joblib.dump(metadata, 'trained_models/advanced/metadata.pkl')

print(f"\n✅ All models saved to 'trained_models/advanced/'")

# ============================================================================
# STEP 10: DETAILED MODEL COMPARISON
# ============================================================================
print("\n" + "=" * 80)
print("📊 STEP 10: Model Performance Comparison")
print("=" * 80)

comparison_df = pd.DataFrame(results).T.sort_values('auc', ascending=False)
print("\n" + comparison_df.to_string())

# ============================================================================
# STEP 11: DETAILED EVALUATION OF BEST MODEL
# ============================================================================
print("\n" + "=" * 80)
print(f"📈 STEP 11: Detailed Evaluation of {best_model_name.upper()}")
print("=" * 80)

if best_model_name == 'isolation_forest':
    y_pred = (iso_proba > 0.5).astype(int)
    y_proba = iso_proba
elif best_model_name == 'deep_nn':
    y_pred = (nn_proba > 0.5).astype(int)
    y_proba = nn_proba
else:
    y_pred = best_model.predict(X_test_scaled)
    y_proba = best_model.predict_proba(X_test_scaled)[:, 1]

print("\n📋 Classification Report:")
print(classification_report(y_test, y_pred, target_names=['Normal', 'Fraud']))

print("\n📊 Confusion Matrix:")
cm = confusion_matrix(y_test, y_pred)
print(cm)
print(f"\n   ✅ True Negatives (Correctly identified normal): {cm[0][0]}")
print(f"   ⚠️  False Positives (Normal flagged as fraud): {cm[0][1]}")
print(f"   🚨 False Negatives (Fraud missed): {cm[1][0]}")
print(f"   ✅ True Positives (Correctly caught fraud): {cm[1][1]}")

# Calculate precision and recall at different thresholds
precision, recall, thresholds = precision_recall_curve(y_test, y_proba)
f1_scores = 2 * (precision * recall) / (precision + recall + 1e-10)
best_threshold_idx = np.argmax(f1_scores)
best_threshold = thresholds[best_threshold_idx] if best_threshold_idx < len(thresholds) else 0.5

print(f"\n🎯 Optimal Threshold: {best_threshold:.3f}")
print(f"   - Precision: {precision[best_threshold_idx]:.2%}")
print(f"   - Recall: {recall[best_threshold_idx]:.2%}")
print(f"   - F1-Score: {f1_scores[best_threshold_idx]:.4f}")

# ============================================================================
# STEP 12: FEATURE IMPORTANCE
# ============================================================================
if best_model_name in ['xgboost', 'lightgbm', 'catboost', 'random_forest']:
    print("\n" + "=" * 80)
    print("📊 STEP 12: Feature Importance Analysis")
    print("=" * 80)
    
    if best_model_name == 'xgboost':
        feature_importance = best_model.feature_importances_
    elif best_model_name == 'lightgbm':
        feature_importance = best_model.feature_importances_
    elif best_model_name == 'catboost':
        feature_importance = best_model.feature_importances_
    else:  # random_forest
        feature_importance = best_model.feature_importances_
    
    importance_df = pd.DataFrame({
        'feature': features,
        'importance': feature_importance
    }).sort_values('importance', ascending=False)
    
    print("\n🔝 Top 10 Most Important Features:")
    for idx, row in importance_df.head(10).iterrows():
        print(f"   {row['feature']:.<40} {row['importance']:.4f}")

# ============================================================================
# FINAL SUMMARY
# ============================================================================
print("\n" + "=" * 80)
print("✅ TRAINING COMPLETE - PRODUCTION-READY MODELS")
print("=" * 80)

print(f"\n🎯 Best Model: {best_model_name.upper()}")
print(f"   - AUC-ROC: {results[best_model_name]['auc']:.4f} {'🎉 EXCELLENT!' if results[best_model_name]['auc'] > 0.90 else ''}")
if 'accuracy' in results[best_model_name]:
    print(f"   - Accuracy: {results[best_model_name]['accuracy']:.2%}")
if 'f1' in results[best_model_name]:
    print(f"   - F1-Score: {results[best_model_name]['f1']:.4f}")

print(f"\n📦 Models trained: {len(models)}")
print(f"📁 Location: trained_models/advanced/")

print("\n🚀 Next Steps:")
print("   1. Test predictions: python ml_models/predict_advanced.py")
print("   2. Update Edge Function to use advanced models")
print("   3. Monitor performance in production")
print("   4. Retrain monthly with new transaction data")

print("\n💡 Production Tips:")
print("   - Use ensemble model for highest accuracy")
print("   - Monitor false positive rate to avoid blocking legitimate users")
print("   - Implement A/B testing to compare model versions")
print("   - Set up automated retraining pipeline")
print("   - Track model drift and performance degradation")

print("\n" + "=" * 80)
