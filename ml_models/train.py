"""
Fraud Detection ML Model Training Script
Trains multiple models (Logistic Regression, Random Forest, Neural Network)
and saves them for production use.
"""

import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import classification_report, confusion_matrix, roc_auc_score
from sklearn.svm import SVC
from sklearn.naive_bayes import GaussianNB
from sklearn.neural_network import MLPClassifier
import joblib
import os
from datetime import datetime
import warnings
warnings.filterwarnings('ignore')

# Create directories if they don't exist
os.makedirs('trained_models', exist_ok=True)
os.makedirs('datasets', exist_ok=True)

print("=" * 60)
print("🤖 Fraud Detection ML Training Pipeline")
print("=" * 60)

# Step 1: Load or Generate Training Data
print("\n📊 Step 1: Loading Training Data...")

# Check if dataset exists, if not create a synthetic one
if not os.path.exists('datasets/fraud_transactions.csv'):
    print("⚠️  No dataset found. Generating synthetic training data...")
    
    # Generate synthetic fraud dataset
    np.random.seed(42)
    n_samples = 10000
    
    # Normal transactions (80%)
    n_normal = int(n_samples * 0.8)
    normal_data = {
        'amount': np.random.exponential(100, n_normal),
        'customer_total_transactions': np.random.poisson(20, n_normal),
        'customer_trust_score': np.random.normal(70, 15, n_normal),
        'customer_average_transaction': np.random.exponential(80, n_normal),
        'hour_of_day': np.random.randint(6, 23, n_normal),
        'day_of_week': np.random.randint(0, 7, n_normal),
        'transaction_velocity_1h': np.random.poisson(2, n_normal),
        'location_distance_km': np.random.exponential(50, n_normal),
        'is_fraud': 0
    }
    
    # Fraudulent transactions (20%)
    n_fraud = n_samples - n_normal
    fraud_data = {
        'amount': np.random.exponential(500, n_fraud),  # Higher amounts
        'customer_total_transactions': np.random.poisson(2, n_fraud),  # New customers
        'customer_trust_score': np.random.normal(30, 10, n_fraud),  # Lower trust
        'customer_average_transaction': np.random.exponential(50, n_fraud),
        'hour_of_day': np.random.choice([1, 2, 3, 4, 23], n_fraud),  # Unusual hours
        'day_of_week': np.random.randint(0, 7, n_fraud),
        'transaction_velocity_1h': np.random.poisson(8, n_fraud),  # High velocity
        'location_distance_km': np.random.exponential(500, n_fraud),  # Far locations
        'is_fraud': 1
    }
    
    # Combine and shuffle
    df_normal = pd.DataFrame(normal_data)
    df_fraud = pd.DataFrame(fraud_data)
    df = pd.concat([df_normal, df_fraud], ignore_index=True)
    df = df.sample(frac=1, random_state=42).reset_index(drop=True)
    
    # Clip values to realistic ranges
    df['customer_trust_score'] = df['customer_trust_score'].clip(0, 100)
    df['hour_of_day'] = df['hour_of_day'].clip(0, 23)
    
    # Save dataset
    df.to_csv('datasets/fraud_transactions.csv', index=False)
    print(f"✅ Generated {n_samples} synthetic transactions")
else:
    df = pd.read_csv('datasets/fraud_transactions.csv')
    print(f"✅ Loaded {len(df)} transactions from dataset")

print(f"   - Normal transactions: {(df['is_fraud'] == 0).sum()}")
print(f"   - Fraudulent transactions: {(df['is_fraud'] == 1).sum()}")
print(f"   - Fraud rate: {df['is_fraud'].mean():.2%}")

# Step 2: Feature Engineering
print("\n🔧 Step 2: Feature Engineering...")

features = [
    'amount',
    'customer_total_transactions',
    'customer_trust_score',
    'customer_average_transaction',
    'hour_of_day',
    'day_of_week',
    'transaction_velocity_1h',
    'location_distance_km'
]

X = df[features]
y = df['is_fraud']

print(f"✅ Using {len(features)} features for training")

# Step 3: Split Data
print("\n✂️  Step 3: Splitting Data...")
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)
print(f"✅ Train set: {len(X_train)} samples")
print(f"✅ Test set: {len(X_test)} samples")

# Step 4: Scale Features
print("\n📏 Step 4: Scaling Features...")
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)
print("✅ Features scaled using StandardScaler")

# Step 5: Train Models
print("\n🎓 Step 5: Training Models...")
print("-" * 60)

models = {}
results = {}

# Model 1: Logistic Regression
print("\n1️⃣  Training Logistic Regression...")
lr_model = LogisticRegression(random_state=42, max_iter=1000)
lr_model.fit(X_train_scaled, y_train)
lr_pred = lr_model.predict(X_test_scaled)
lr_proba = lr_model.predict_proba(X_test_scaled)[:, 1]
models['logistic'] = lr_model
results['logistic'] = {
    'accuracy': lr_model.score(X_test_scaled, y_test),
    'auc': roc_auc_score(y_test, lr_proba)
}
print(f"   ✅ Accuracy: {results['logistic']['accuracy']:.2%}")
print(f"   ✅ AUC-ROC: {results['logistic']['auc']:.3f}")

# Model 2: Random Forest
print("\n2️⃣  Training Random Forest...")
rf_model = RandomForestClassifier(
    n_estimators=100,
    max_depth=10,
    random_state=42,
    n_jobs=-1
)
rf_model.fit(X_train_scaled, y_train)
rf_pred = rf_model.predict(X_test_scaled)
rf_proba = rf_model.predict_proba(X_test_scaled)[:, 1]
models['random_forest'] = rf_model
results['random_forest'] = {
    'accuracy': rf_model.score(X_test_scaled, y_test),
    'auc': roc_auc_score(y_test, rf_proba)
}
print(f"   ✅ Accuracy: {results['random_forest']['accuracy']:.2%}")
print(f"   ✅ AUC-ROC: {results['random_forest']['auc']:.3f}")

# Model 3: Gradient Boosting
print("\n3️⃣  Training Gradient Boosting...")
gb_model = GradientBoostingClassifier(
    n_estimators=100,
    learning_rate=0.1,
    max_depth=5,
    random_state=42
)
gb_model.fit(X_train_scaled, y_train)
gb_pred = gb_model.predict(X_test_scaled)
gb_proba = gb_model.predict_proba(X_test_scaled)[:, 1]
models['gradient_boosting'] = gb_model
results['gradient_boosting'] = {
    'accuracy': gb_model.score(X_test_scaled, y_test),
    'auc': roc_auc_score(y_test, gb_proba)
}
print(f"   ✅ Accuracy: {results['gradient_boosting']['accuracy']:.2%}")
print(f"   ✅ AUC-ROC: {results['gradient_boosting']['auc']:.3f}")

# Model 4: Support Vector Machine (SVM)
print("\n4️⃣  Training Support Vector Machine...")
svm_model = SVC(
    kernel='rbf',
    probability=True,
    random_state=42,
    C=1.0,
    gamma='scale'
)
svm_model.fit(X_train_scaled, y_train)
svm_pred = svm_model.predict(X_test_scaled)
svm_proba = svm_model.predict_proba(X_test_scaled)[:, 1]
models['svm'] = svm_model
results['svm'] = {
    'accuracy': svm_model.score(X_test_scaled, y_test),
    'auc': roc_auc_score(y_test, svm_proba)
}
print(f"   ✅ Accuracy: {results['svm']['accuracy']:.2%}")
print(f"   ✅ AUC-ROC: {results['svm']['auc']:.3f}")

# Model 5: Naive Bayes
print("\n5️⃣  Training Naive Bayes...")
nb_model = GaussianNB()
nb_model.fit(X_train_scaled, y_train)
nb_pred = nb_model.predict(X_test_scaled)
nb_proba = nb_model.predict_proba(X_test_scaled)[:, 1]
models['naive_bayes'] = nb_model
results['naive_bayes'] = {
    'accuracy': nb_model.score(X_test_scaled, y_test),
    'auc': roc_auc_score(y_test, nb_proba)
}
print(f"   ✅ Accuracy: {results['naive_bayes']['accuracy']:.2%}")
print(f"   ✅ AUC-ROC: {results['naive_bayes']['auc']:.3f}")

# Model 6: Neural Network (MLP)
print("\n6️⃣  Training Neural Network (MLP)...")
nn_model = MLPClassifier(
    hidden_layer_sizes=(64, 32, 16),
    activation='relu',
    solver='adam',
    max_iter=500,
    random_state=42,
    early_stopping=True,
    validation_fraction=0.1
)
nn_model.fit(X_train_scaled, y_train)
nn_pred = nn_model.predict(X_test_scaled)
nn_proba = nn_model.predict_proba(X_test_scaled)[:, 1]
models['neural_network'] = nn_model
results['neural_network'] = {
    'accuracy': nn_model.score(X_test_scaled, y_test),
    'auc': roc_auc_score(y_test, nn_proba)
}
print(f"   ✅ Accuracy: {results['neural_network']['accuracy']:.2%}")
print(f"   ✅ AUC-ROC: {results['neural_network']['auc']:.3f}")

# Step 6: Select Best Model
print("\n🏆 Step 6: Selecting Best Model...")
best_model_name = max(results, key=lambda x: results[x]['auc'])
best_model = models[best_model_name]
print(f"✅ Best model: {best_model_name.upper()}")
print(f"   - AUC-ROC: {results[best_model_name]['auc']:.3f}")

# Step 7: Save Models
print("\n💾 Step 7: Saving Models...")
timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

# Save all models
joblib.dump(models['logistic'], 'trained_models/logistic_model.pkl')
joblib.dump(models['random_forest'], 'trained_models/rf_model.pkl')
joblib.dump(models['gradient_boosting'], 'trained_models/gb_model.pkl')
joblib.dump(models['svm'], 'trained_models/svm_model.pkl')
joblib.dump(models['naive_bayes'], 'trained_models/nb_model.pkl')
joblib.dump(models['neural_network'], 'trained_models/nn_model.pkl')
joblib.dump(scaler, 'trained_models/scaler.pkl')

# Save best model separately
joblib.dump(best_model, 'trained_models/best_model.pkl')

# Save metadata
metadata = {
    'timestamp': timestamp,
    'best_model': best_model_name,
    'features': features,
    'results': results,
    'training_samples': len(X_train),
    'test_samples': len(X_test)
}
joblib.dump(metadata, 'trained_models/metadata.pkl')

print("✅ Saved models:")
print("   - trained_models/logistic_model.pkl")
print("   - trained_models/rf_model.pkl")
print("   - trained_models/gb_model.pkl")
print("   - trained_models/svm_model.pkl")
print("   - trained_models/nb_model.pkl")
print("   - trained_models/nn_model.pkl")
print("   - trained_models/best_model.pkl")
print("   - trained_models/scaler.pkl")
print("   - trained_models/metadata.pkl")

# Step 8: Feature Importance
print("\n📊 Step 8: Feature Importance (Random Forest)...")
feature_importance = pd.DataFrame({
    'feature': features,
    'importance': rf_model.feature_importances_
}).sort_values('importance', ascending=False)

print("\nTop Features:")
for idx, row in feature_importance.head(5).iterrows():
    print(f"   {row['feature']}: {row['importance']:.3f}")

# Step 9: Detailed Evaluation of Best Model
print("\n📈 Step 9: Detailed Evaluation...")
print("\nClassification Report:")
print(classification_report(y_test, best_model.predict(X_test_scaled)))

print("\nConfusion Matrix:")
cm = confusion_matrix(y_test, best_model.predict(X_test_scaled))
print(cm)
print(f"   True Negatives: {cm[0][0]}")
print(f"   False Positives: {cm[0][1]}")
print(f"   False Negatives: {cm[1][0]}")
print(f"   True Positives: {cm[1][1]}")

print("\n" + "=" * 60)
print("✅ TRAINING COMPLETE!")
print("=" * 60)
print(f"\n🎯 Next Steps:")
print("   1. Test predictions: python predict.py")
print("   2. Deploy to production: Update ml-predict Edge Function")
print("   3. Monitor performance and retrain periodically")
print("\n💡 Tip: Run 'python train.py' regularly with new data to improve accuracy!")
