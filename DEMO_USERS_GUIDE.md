# E-Commerce Fraud Detection Demo Guide

This guide provides 5 demo users with specific fraud scenarios to demonstrate the ML-based fraud detection system with Explainable AI (XAI).

---

## Quick Setup

### SQL to Create Demo Users (Run in Supabase SQL Editor)

```sql
-- First, create auth users in Supabase Dashboard > Authentication > Users
-- Then run this to create their e-commerce profiles

-- Clear existing demo data
DELETE FROM ecommerce_customer_profiles WHERE email IN (
  'alice.trusted@demo.com',
  'bob.newuser@demo.com', 
  'charlie.velocity@demo.com',
  'diana.traveler@demo.com',
  'eve.highvalue@demo.com'
);

-- Demo User 1: Alice - Trusted Long-term Customer
INSERT INTO ecommerce_customer_profiles (user_id, email, full_name, home_city, home_country, trust_score, total_transactions, average_transaction_amount, customer_type)
SELECT id, 'alice.trusted@demo.com', 'Alice Sharma', 'Mumbai', 'India', 85, 47, 2500.00, 'trusted'
FROM auth.users WHERE email = 'alice.trusted@demo.com';

-- Demo User 2: Bob - New Customer
INSERT INTO ecommerce_customer_profiles (user_id, email, full_name, home_city, home_country, trust_score, total_transactions, average_transaction_amount, customer_type)
SELECT id, 'bob.newuser@demo.com', 'Bob Patel', 'Delhi', 'India', 45, 2, 1200.00, 'new'
FROM auth.users WHERE email = 'bob.newuser@demo.com';

-- Demo User 3: Charlie - Velocity Abuser Pattern
INSERT INTO ecommerce_customer_profiles (user_id, email, full_name, home_city, home_country, trust_score, total_transactions, average_transaction_amount, customer_type)
SELECT id, 'charlie.velocity@demo.com', 'Charlie Kumar', 'Bangalore', 'India', 35, 15, 800.00, 'suspicious'
FROM auth.users WHERE email = 'charlie.velocity@demo.com';

-- Demo User 4: Diana - Location Hopper/Traveler
INSERT INTO ecommerce_customer_profiles (user_id, email, full_name, home_city, home_country, trust_score, total_transactions, average_transaction_amount, customer_type)
SELECT id, 'diana.traveler@demo.com', 'Diana Singh', 'Chennai', 'India', 60, 23, 4500.00, 'regular'
FROM auth.users WHERE email = 'diana.traveler@demo.com';

-- Demo User 5: Eve - High Value Customer (Potential Account Takeover Target)
INSERT INTO ecommerce_customer_profiles (user_id, email, full_name, home_city, home_country, trust_score, total_transactions, average_transaction_amount, customer_type)
SELECT id, 'eve.highvalue@demo.com', 'Eve Reddy', 'Hyderabad', 'India', 92, 89, 15000.00, 'premium'
FROM auth.users WHERE email = 'eve.highvalue@demo.com';
```

### Create Auth Users First
In Supabase Dashboard → Authentication → Users → Add User:
| Email | Password |
|-------|----------|
| alice.trusted@demo.com | Demo@123 |
| bob.newuser@demo.com | Demo@123 |
| charlie.velocity@demo.com | Demo@123 |
| diana.traveler@demo.com | Demo@123 |
| eve.highvalue@demo.com | Demo@123 |

---

## Demo Users & Scenarios

### 👤 User 1: Alice Sharma (Trusted Customer)
**Email:** `alice.trusted@demo.com`  
**Password:** `Demo@123`  
**Profile:** Long-term customer with 47 transactions, trust score 85

#### Scenario 1: ✅ Normal Legitimate Transaction
- **Action:** Add any product under ₹5,000 to cart and checkout
- **Expected Result:** LOW fraud score (10-25%), APPROVED
- **XAI Explanation:** "Trusted customer with consistent purchase history"
- **Key Factors:** High trust score, normal amount, home location

#### Scenario 2: ✅ Slightly Higher Amount (Still Legitimate)
- **Action:** Add products worth ₹8,000-₹10,000
- **Expected Result:** LOW-MEDIUM fraud score (20-35%), APPROVED
- **XAI Explanation:** "Amount slightly above average but within trusted customer range"
- **Key Factors:** Amount deviation acceptable for trusted users

#### Scenario 3: ⚠️ Unusual High Amount (Flagged for Review)
- **Action:** Add products worth ₹50,000+
- **Expected Result:** MEDIUM fraud score (45-60%), FLAGGED
- **XAI Explanation:** "Significant deviation from average transaction amount"
- **Key Factors:** Amount 20x average triggers review

#### Scenario 4: ⚠️ Late Night Transaction
- **Action:** Make purchase between 2:00 AM - 5:00 AM
- **Expected Result:** MEDIUM fraud score (35-50%), FLAGGED
- **XAI Explanation:** "Unusual transaction time detected"
- **Key Factors:** Time anomaly + trusted user = review, not block

#### Scenario 5: ❌ Account Takeover Simulation
- **Action:** Use VPN to appear from Nigeria/Russia, high amount at odd hours
- **Expected Result:** HIGH fraud score (75-90%), BLOCKED
- **XAI Explanation:** "Multiple risk factors: geolocation mismatch, unusual time, amount deviation"
- **Key Factors:** Even trusted accounts blocked with multiple red flags

---

### 👤 User 2: Bob Patel (New Customer)
**Email:** `bob.newuser@demo.com`  
**Password:** `Demo@123`  
**Profile:** Brand new customer with only 2 transactions, trust score 45

#### Scenario 1: ✅ Small First Purchase (Building Trust)
- **Action:** Add product under ₹1,500 to cart
- **Expected Result:** LOW-MEDIUM fraud score (25-35%), APPROVED
- **XAI Explanation:** "New customer with small first purchase - typical onboarding pattern"
- **Key Factors:** Low amount compensates for new account risk

#### Scenario 2: ⚠️ Moderate Purchase (Review Needed)
- **Action:** Add products worth ₹5,000-₹8,000
- **Expected Result:** MEDIUM fraud score (40-55%), FLAGGED
- **XAI Explanation:** "New customer making above-average purchase"
- **Key Factors:** Limited history + moderate amount = manual review

#### Scenario 3: ❌ High Value First Purchase (Blocked)
- **Action:** Add products worth ₹25,000+
- **Expected Result:** HIGH fraud score (70-85%), BLOCKED
- **XAI Explanation:** "High-risk pattern: new account with premium purchase"
- **Key Factors:** Classic fraud pattern - new accounts making large purchases

#### Scenario 4: ⚠️ Multiple Small Purchases Rapidly
- **Action:** Complete 3+ purchases within 10 minutes
- **Expected Result:** MEDIUM-HIGH fraud score (55-70%), FLAGGED/BLOCKED
- **XAI Explanation:** "Velocity abuse detected - multiple transactions in short window"
- **Key Factors:** Transaction velocity exceeds normal patterns

#### Scenario 5: ❌ Shipping Address Mismatch
- **Action:** Use shipping address in different city than registration
- **Expected Result:** HIGH fraud score (65-80%), FLAGGED/BLOCKED
- **XAI Explanation:** "Shipping location doesn't match customer profile location"
- **Key Factors:** Address mismatch on new account is high risk

---

### 👤 User 3: Charlie Kumar (Velocity Abuser)
**Email:** `charlie.velocity@demo.com`  
**Password:** `Demo@123`  
**Profile:** Suspicious account with velocity abuse history, trust score 35

#### Scenario 1: ⚠️ Single Normal Transaction
- **Action:** Add one product under ₹2,000
- **Expected Result:** MEDIUM fraud score (35-45%), FLAGGED
- **XAI Explanation:** "Account has previous velocity abuse flags"
- **Key Factors:** Low trust score triggers extra scrutiny

#### Scenario 2: ❌ Classic Velocity Attack
- **Action:** Attempt 5+ purchases within 5 minutes
- **Expected Result:** HIGH fraud score (80-95%), BLOCKED
- **XAI Explanation:** "Severe velocity abuse - card testing pattern detected"
- **Key Factors:** Transaction frequency indicates bot/fraud script

#### Scenario 3: ❌ Card Testing Pattern
- **Action:** Make purchases of ₹100, ₹200, ₹500, ₹1000 sequentially
- **Expected Result:** HIGH fraud score (85-95%), BLOCKED
- **XAI Explanation:** "Incremental amount testing - typical stolen card validation"
- **Key Factors:** Sequential small amounts = card limit testing

#### Scenario 4: ❌ Different Products Rapid Fire
- **Action:** Add different products to separate carts, checkout quickly
- **Expected Result:** HIGH fraud score (75-90%), BLOCKED
- **XAI Explanation:** "Multiple concurrent sessions detected"
- **Key Factors:** Parallel purchase attempts indicate fraud

#### Scenario 5: ⚠️ Reformed Behavior (Slow Recovery)
- **Action:** Wait 24 hours, make single small purchase
- **Expected Result:** MEDIUM fraud score (40-55%), FLAGGED
- **XAI Explanation:** "Previous abuse history, monitoring for improvement"
- **Key Factors:** Trust recovery takes time - flagged but not blocked

---

### 👤 User 4: Diana Singh (Location Hopper/Traveler)
**Email:** `diana.traveler@demo.com`  
**Password:** `Demo@123`  
**Profile:** Regular customer who travels frequently, trust score 60

#### Scenario 1: ✅ Purchase from Home City
- **Action:** Purchase from Chennai (home city) IP
- **Expected Result:** LOW fraud score (20-30%), APPROVED
- **XAI Explanation:** "Transaction from registered home location"
- **Key Factors:** Location matches profile

#### Scenario 2: ⚠️ Domestic Travel Purchase
- **Action:** Use VPN to appear from Mumbai or Delhi
- **Expected Result:** MEDIUM fraud score (40-55%), FLAGGED
- **XAI Explanation:** "Transaction from different Indian city - possible travel"
- **Key Factors:** Domestic location change = review, not block

#### Scenario 3: ⚠️ International Location
- **Action:** Use VPN to appear from USA or UK
- **Expected Result:** MEDIUM-HIGH fraud score (55-70%), FLAGGED
- **XAI Explanation:** "International transaction from trusted country"
- **Key Factors:** Low-risk country + regular customer = review

#### Scenario 4: ❌ High-Risk Country Location
- **Action:** Use VPN to appear from Nigeria, Russia, or Vietnam
- **Expected Result:** HIGH fraud score (75-90%), BLOCKED
- **XAI Explanation:** "Transaction from high-fraud-risk geography"
- **Key Factors:** High-risk country override normal trust

#### Scenario 5: ❌ Impossible Travel (Geolocation Fraud)
- **Action:** Make purchase from Chennai, then immediately from London (use VPN)
- **Expected Result:** HIGH fraud score (85-95%), BLOCKED
- **XAI Explanation:** "Impossible travel detected - location jump within minutes"
- **Key Factors:** Geographic impossibility = definite fraud

---

### 👤 User 5: Eve Reddy (Premium/High-Value Customer)
**Email:** `eve.highvalue@demo.com`  
**Password:** `Demo@123`  
**Profile:** Premium customer with 89 transactions, average ₹15,000, trust score 92

#### Scenario 1: ✅ Normal Premium Purchase
- **Action:** Add products worth ₹15,000-₹25,000
- **Expected Result:** LOW fraud score (10-20%), APPROVED
- **XAI Explanation:** "Premium customer making typical high-value purchase"
- **Key Factors:** Amount within expected range for premium tier

#### Scenario 2: ✅ Very High Value (Still Legitimate)
- **Action:** Add products worth ₹75,000-₹100,000
- **Expected Result:** LOW-MEDIUM fraud score (25-40%), APPROVED
- **XAI Explanation:** "High-value customer with excellent track record"
- **Key Factors:** Trust score 92 allows higher amounts

#### Scenario 3: ⚠️ Unusual Low-Value Purchase
- **Action:** Add single product under ₹500
- **Expected Result:** MEDIUM fraud score (35-50%), FLAGGED
- **XAI Explanation:** "Unusual pattern - premium customer making micro-purchase"
- **Key Factors:** Deviation from normal behavior triggers review

#### Scenario 4: ❌ Account Compromise Pattern
- **Action:** From foreign IP, change shipping address, make ₹50,000 purchase
- **Expected Result:** HIGH fraud score (80-95%), BLOCKED
- **XAI Explanation:** "Account takeover indicators: new device, new location, address change"
- **Key Factors:** Premium accounts are prime targets - extra protection

#### Scenario 5: ❌ Credential Stuffing Simulation
- **Action:** Multiple failed login attempts, then successful with large purchase
- **Expected Result:** HIGH fraud score (75-90%), BLOCKED
- **XAI Explanation:** "Suspicious login pattern followed by high-value transaction"
- **Key Factors:** Login anomalies + immediate purchase = compromised account

---

## Fraud Patterns Reference

### Pattern Categories

| Pattern | Description | Detection Method | Typical Score |
|---------|-------------|------------------|---------------|
| **Velocity Abuse** | 3+ transactions in 10 minutes | Time-based rules | 70-95% |
| **Geolocation Mismatch** | Transaction from different country | IP geolocation | 60-90% |
| **Amount Anomaly** | Purchase far above/below average | Statistical deviation | 40-70% |
| **Time Anomaly** | Transaction at unusual hours (2-6 AM) | Time pattern analysis | 30-50% |
| **New Account Fraud** | High-value purchase on new account | Account age + amount | 65-85% |
| **Card Testing** | Multiple small incremental purchases | Amount pattern matching | 80-95% |
| **Impossible Travel** | Location jump physically impossible | Geo-velocity analysis | 85-95% |
| **Account Takeover** | Trusted account + new device + location | Multi-factor analysis | 75-95% |

### XAI Risk Factors

The system displays these risk factors with explanations:

| Factor | Icon | When Triggered |
|--------|------|----------------|
| **Transaction Amount** | 📊 | Amount deviates from user average |
| **Transaction Velocity** | ⚡ | Multiple transactions in short time |
| **Geolocation Risk** | 🌍 | Location mismatch or high-risk country |
| **Time Pattern** | 🕐 | Unusual transaction time |
| **Customer Trust** | ⭐ | Low trust score or new account |
| **Device Fingerprint** | 📱 | New or suspicious device |
| **Shipping Mismatch** | 📦 | Shipping address differs from profile |

---

## Demo Flow Recommendations

### For Evaluation/Presentation

1. **Start with Alice** (Trusted) - Show legitimate transactions work smoothly
2. **Switch to Bob** (New) - Demonstrate new customer handling
3. **Use Charlie** (Velocity) - Show velocity attack detection
4. **Demo Diana** (Traveler) - Explain geolocation intelligence
5. **End with Eve** (Premium) - Show account takeover protection

### Key Points to Highlight

1. **XAI Transparency** - Every decision has explainable factors
2. **Adaptive Thresholds** - Trust scores adjust behavior
3. **Multi-Factor Analysis** - No single factor determines outcome
4. **Real-Time Detection** - Instant fraud scoring
5. **User Experience** - Legitimate users rarely inconvenienced

---

## Data Flow: Checkout → Dashboard

When a transaction is completed at checkout, the data flows to:

1. **Dashboard** → Transaction Stream shows the transaction in real-time
2. **Fraud Alerts** → If flagged/blocked, an alert appears
3. **Transactions** → Full transaction history table
4. **Analytics** → Stats updated (detection rate, avg score, etc.)

All data is stored in browser memory via SimulationContext and persists per user session.

---

## Troubleshooting

### Login Issues
- Ensure user exists in Supabase Auth (Dashboard → Authentication)
- Verify profile exists in `ecommerce_customer_profiles`
- Check password is correct (`Demo@123`)

### Fraud Score Not Showing
- Ensure ML API is running (`python ml_models/api_server.py`)
- Check browser console for API errors
- Enable `USE_LOCAL_SIMULATION` flag for demo fallback

### Transactions Not Recording
- Verify `ecommerce_transactions` table exists
- Check RLS policies allow inserts
- Confirm user is authenticated

### Data Not Appearing in Dashboard
- Ensure you're logged in as a merchant (not e-commerce customer)
- Complete a checkout to generate transaction data
- Check browser console for errors

---

**Last Updated:** January 2025  
**Version:** 1.0
