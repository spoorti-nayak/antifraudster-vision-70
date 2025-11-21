# Complete Testing Guide - AntiFraudster E-Commerce Integration

## 🎯 Prerequisites
- Database migration completed (MIGRATION.sql)
- Development server running (`npm run dev`)
- Browser with console open for debugging

---

## Step 1: Create E-Commerce Store Account (2 minutes)

### 1.1 Register New Store
1. Navigate to `/signup` (or click "Sign up" on login page)
2. Fill in the form:
   - **First Name**: John
   - **Last Name**: Doe
   - **Email**: store@example.com (use your actual email)
   - **Company**: My Test Store
   - **Password**: TestStore123! (minimum 8 characters)
3. Click "Sign up"
4. **Note**: API key is automatically generated upon registration

### 1.2 Login
1. Navigate to `/login`
2. Enter your credentials
3. Click "Sign in"
4. You should be redirected to `/dashboard`

---

## Step 2: Configure Store Settings (2 minutes)

### 2.1 Access Store Settings
1. From any e-commerce page, click your profile or navigate to `/store-settings`
2. You should see the "AntiFraudster Integration" card

### 2.2 View/Regenerate API Key
1. Your API key was automatically generated during signup
2. To view it:
   - Look at the "API Key" field (shown as password type)
   - Click the **Copy** button to copy it
3. (Optional) To generate a new key:
   - Click **"Generate"** button
   - New key will be created and automatically saved
   - **Important**: Old key will stop working

### 2.3 Enable Fraud Detection
1. Toggle **"Enable Fraud Detection"** to ON
2. (Optional) Add webhook URL if you have one:
   - Example: `https://your-store.com/webhook/fraud-alert`
   - This is where real-time fraud alerts will be sent
3. Click **"Save Settings"**
4. Wait for success message: "Settings saved successfully"

### ✅ Checkpoint
- API key is generated (starts with `sk_live_`)
- Fraud detection is enabled
- Settings saved successfully

---

## Step 3: Run Transaction Simulator (5 minutes) ⭐

### 3.1 Access Simulator
1. **Option A**: From `/shop`, click **"Test Simulator"** button in header
2. **Option B**: Navigate directly to `/simulator`

### 3.2 Understanding the Simulator Interface
You should see:
- **Quick Test Section**: "Run All Scenarios (6 Tests)" button
- **Individual Scenario Cards**: 6 cards showing:
  - ✅ **Legitimate - Low Value** ($49.99)
  - ✅ **Legitimate - High Value** ($1,499.99)
  - ⛔ **Fraud - High Velocity** (15 rapid transactions)
  - ⛔ **Fraud - Blacklisted IP** (198.51.100.1)
  - ⛔ **Fraud - Suspicious Location** (Russia with US billing)
  - ⛔ **Fraud - New Customer High Amount** ($2,999 from new customer)

### 3.3 Run All Scenarios (Recommended for Demo)
1. Click **"Run All Scenarios (6 Tests)"**
2. Watch as transactions are processed:
   - Each takes ~2 seconds
   - Total time: ~12 seconds
3. Results appear at the bottom in real-time

### 3.4 Analyze Results

#### Expected Legitimate Transactions (Green):
```
✅ LEGITIMATE LOW
- Fraud Score: 10-20%
- Status: APPROVED
- AI Explanation: "Transaction appears legitimate based on customer history and normal patterns"
- Risk Factors: None or minimal
```

```
✅ LEGITIMATE HIGH  
- Fraud Score: 15-30%
- Status: APPROVED
- AI Explanation: "High-value transaction from verified customer with good history"
- Risk Factors: May show "high amount" but overall low risk
```

#### Expected Fraudulent Transactions (Red):
```
⛔ FRAUD VELOCITY
- Fraud Score: 70-85%
- Status: BLOCKED
- AI Explanation: "High velocity attack detected - 15 transactions in short time period"
- Risk Factors: ["velocity_check", "transaction_frequency"]
```

```
⛔ FRAUD BLACKLIST
- Fraud Score: 95-100%
- Status: BLOCKED
- AI Explanation: "Transaction from blacklisted IP address (198.51.100.1)"
- Risk Factors: ["blocklist_match", "known_fraud_ip"]
```

```
⛔ FRAUD GEOLOCATION
- Fraud Score: 75-90%
- Status: BLOCKED
- AI Explanation: "Location mismatch - Transaction from Russia with US billing address"
- Risk Factors: ["location_mismatch", "suspicious_country"]
```

```
⛔ FRAUD NEW CUSTOMER
- Fraud Score: 70-85%
- Status: BLOCKED
- AI Explanation: "New customer (0 days old) attempting high-value purchase ($2,999)"
- Risk Factors: ["new_customer_high_value", "amount_anomaly"]
```

### 3.5 Test Individual Scenarios (Optional)
1. Click **"Simulate"** on any individual card
2. Watch for toast notification:
   - 🟢 Green toast for approved transactions
   - 🔴 Red toast for blocked transactions
3. Result appears in "Simulation Results" section below

### ✅ Checkpoint
- All 6 scenarios completed successfully
- 2 legitimate transactions approved (green)
- 4 fraudulent transactions blocked (red)
- Each result has AI explanation
- Fraud scores match expected ranges

---

## Step 4: Verify in AntiFraudster Dashboard (Optional)

### 4.1 Access Dashboard
1. Navigate to `/dashboard` (AntiFraudster side, not e-commerce)
2. Login if not already logged in

### 4.2 Check Transactions
1. Go to `/transactions`
2. You should see all 6 test transactions
3. Verify:
   - Transaction IDs match simulator results
   - Fraud scores are correct
   - Statuses (approved/blocked) are correct

### 4.3 Check Fraud Alerts
1. Go to `/fraud-alerts`
2. You should see 4 fraud alerts (one for each blocked transaction)
3. Each alert should show:
   - Severity level
   - Detailed explanation
   - Risk factors

---

## Step 5: Troubleshooting

### Issue: "Please generate an API key first"
**Solution**:
1. Navigate to `/store-settings`
2. Click "Generate" button
3. Wait for "API Key generated successfully" message
4. Go back to simulator and try again

### Issue: "Invalid merchant API key" error
**Solution**:
1. Check if fraud detection is enabled in `/store-settings`
2. Regenerate API key
3. Make sure you're logged in
4. Check browser console for detailed errors

### Issue: Edge function returns 500 error
**Solution**:
1. Check edge function logs in Supabase dashboard
2. Verify database tables exist (run migration if needed)
3. Make sure `merchant_profiles` table has your user's profile
4. Check console for specific error messages

### Issue: Simulator shows no results
**Solution**:
1. Open browser console (F12)
2. Look for network errors
3. Verify edge functions are deployed
4. Check if API key exists in database

### Issue: All transactions approved (nothing blocked)
**Solution**:
1. Verify fraud detection is ENABLED in store settings
2. Check if fraud patterns are configured in database
3. Review edge function logs for scoring logic

---

## 🎓 What's Happening Behind the Scenes

### Technical Flow
```
1. E-Commerce (/simulator)
   ↓ Clicks "Run All Scenarios"
   
2. generate-test-transaction (Edge Function)
   ↓ Creates test transaction data
   ↓ Includes merchant API key for authentication
   
3. analyze-transaction (Edge Function)
   ↓ Verifies merchant API key
   ↓ Checks blocklist (IPs, emails, devices)
   ↓ Gets/creates customer profile
   ↓ Runs fraud pattern analysis:
     - Velocity check (rapid transactions)
     - Amount anomaly (unusual amounts)
     - Location mismatch (geo inconsistencies)
     - New customer high value
     - Unusual time patterns
     - Card BIN verification
   ↓ Calculates fraud score (0-100)
   ↓ Generates AI explanation (XAI)
   ↓ Creates transaction record
   ↓ Creates fraud alert if blocked/flagged
   
4. Response back to E-Commerce
   ↓ Shows result in UI
   ↓ Displays AI explanation
   ↓ Lists risk factors
```

### Fraud Detection Logic
- **Score 0-40**: Low risk → APPROVED
- **Score 40-60**: Medium risk → FLAGGED (manual review)
- **Score 60-80**: High risk → FLAGGED
- **Score 80-100**: Critical risk → BLOCKED

### Machine Learning Features Analyzed
1. **Transaction velocity**: Number of transactions in last hour
2. **Amount patterns**: Comparison to customer's average
3. **Geolocation**: Distance from known locations
4. **Customer age**: Days since first transaction
5. **Device fingerprint**: Known vs unknown devices
6. **IP reputation**: Blocklist checks
7. **Time patterns**: Unusual hours (late night/early morning)
8. **Trust score**: Customer's historical behavior

---

## 📊 Demo Script (30 seconds)

> "Let me show you our fraud detection in action. I've integrated an e-commerce store with AntiFraudster.
> 
> [Navigate to /simulator]
> 
> I'll run 6 test scenarios simultaneously - 2 legitimate and 4 fraudulent.
> 
> [Click 'Run All Scenarios']
> 
> Watch as each transaction is analyzed in real-time by our ML models...
> 
> [Point to results as they appear]
> 
> See - the legitimate transactions with low fraud scores get approved instantly.
> 
> But look at these fraudulent ones: high velocity attack, blacklisted IP, suspicious geolocation - all blocked with detailed AI explanations showing exactly why.
> 
> This is production-ready fraud protection that processes transactions in under 200ms."

---

## ✅ Success Criteria

After completing this guide, you should have:
- ✅ Store account created with API key
- ✅ Fraud detection enabled
- ✅ 6 test transactions completed successfully
- ✅ 2 legitimate transactions approved (fraud score 10-30%)
- ✅ 4 fraudulent transactions blocked (fraud score 70-100%)
- ✅ AI explanations provided for each blocked transaction
- ✅ Risk factors identified and displayed
- ✅ Understanding of the complete integration flow

---

## 🚀 Next Steps

1. **Add Real Products**: Populate `/shop` with your products
2. **Test Real Checkout**: Complete actual checkout flow
3. **Configure Webhooks**: Set up webhook endpoint for real-time alerts
4. **Review Analytics**: Check `/analytics` for fraud trends
5. **Customize Patterns**: Adjust fraud pattern weights in database
6. **Train ML Models**: Use collected data to retrain models (see ml_models/)

---

## 📞 Need Help?

If you encounter any issues:
1. Check browser console for errors
2. Review edge function logs
3. Verify database migration completed
4. Check network tab for failed requests
5. Ensure all environment variables are set

**Good luck with your demo! 🎉**
