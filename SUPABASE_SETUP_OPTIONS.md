# Supabase Setup Options - Complete Guide

This document explains **3 different ways** to set up your Supabase backend for the AntiFraudster project when running locally in VS Code.

---

## 📊 Quick Comparison

| Option | Pros | Cons | Best For |
|--------|------|------|----------|
| **A: Lovable Cloud** | ✅ Already setup<br>✅ Zero config<br>✅ Cloud-hosted | ❌ Tied to Lovable | Quick testing, demos |
| **B: Supabase Cloud** | ✅ Free tier<br>✅ Production-ready<br>✅ Easy sharing<br>✅ Dashboard access | ❌ Requires account<br>❌ Internet needed | Production, team projects |
| **C: Local Docker** | ✅ Fully offline<br>✅ Complete control<br>✅ Fast iteration<br>✅ No data limits | ❌ Requires Docker<br>❌ More complex<br>❌ Local only | Advanced development |

---

## Option A: Use Existing Lovable Cloud (Easiest) ⚡

### When to Use
- You cloned from Lovable and want quick setup
- You're just testing/learning
- You want zero configuration

### What You Get
- Pre-configured Supabase project
- Project ID: `xvelszpgrkmkdpgzadrs`
- Already has database, auth, and storage setup

### Setup Steps

**1. No Setup Needed!**
Your `.env` file already has:
```bash
VITE_SUPABASE_PROJECT_ID="xvelszpgrkmkdpgzadrs"
VITE_SUPABASE_PUBLISHABLE_KEY="eyJ..."
VITE_SUPABASE_URL="https://xvelszpgrkmkdpgzadrs.supabase.co"
```

**2. Just Run:**
```bash
npm install
npm run dev
```

**3. That's it!** ✅
Go to `http://localhost:8080` and start coding.

### Access Your Data
- You can view data through the Lovable dashboard
- Database is managed by Lovable Cloud
- Migrations run automatically when deployed to Lovable

### Limitations
- Can't access Supabase dashboard directly
- Tied to Lovable account
- Need internet connection

---

## Option B: Create Your Own Supabase Cloud Project (Recommended) 🌐

### When to Use
- You want your own production environment
- You need full dashboard access
- You want to deploy outside Lovable
- You're building a real product

### What You Get
- Your own Supabase account and dashboard
- Full control over database, auth, storage
- Free tier: 500MB database, 1GB storage, 50GB bandwidth
- Production-ready infrastructure

### Setup Steps

#### 1. Create Supabase Account

Go to [https://supabase.com](https://supabase.com)
- Click "Start your project"
- Sign up with GitHub/Google/Email (FREE)
- Verify your email

#### 2. Create New Project

In Supabase Dashboard:
1. Click "New Project"
2. Choose organization (or create one)
3. Fill in project details:
   ```
   Name: antifraudster
   Database Password: [STRONG PASSWORD - save this!]
   Region: [Choose closest to you]
   Pricing Plan: Free
   ```
4. Click "Create new project"
5. **Wait 2-3 minutes** for provisioning

#### 3. Get API Keys

Once project is ready:
1. Click "Settings" (⚙️ icon in sidebar)
2. Click "API" section
3. You'll see:
   ```
   Project URL: https://xxxxx.supabase.co
   Project ID: xxxxx
   anon public key: eyJ... (long string)
   service_role key: eyJ... (long string - SECRET!)
   ```
4. **Copy all of these!**

#### 4. Update .env File

Replace contents of `.env`:
```bash
VITE_SUPABASE_PROJECT_ID="your_project_id"
VITE_SUPABASE_PUBLISHABLE_KEY="your_anon_key_here"
VITE_SUPABASE_URL="https://your_project_id.supabase.co"
```

#### 5. Create supabase/.env

Create `supabase/.env` (for edge functions):
```bash
mkdir -p supabase
cat > supabase/.env << EOF
SUPABASE_URL=https://your_project_id.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
SUPABASE_DB_URL=your_db_connection_string
LOVABLE_API_KEY=la_your_api_key_here
EOF
```

**To get DB connection string:**
- Settings → Database → Connection String → URI
- Copy the full `postgresql://postgres:...` string

#### 6. Configure Authentication

In Supabase Dashboard:
1. Go to "Authentication" → "Providers"
2. **Enable Email provider** (toggle on)
3. Go to "Authentication" → "URL Configuration"
4. Set:
   ```
   Site URL: http://localhost:8080
   Redirect URLs: http://localhost:8080/**
   ```
5. Go to "Authentication" → "Email Templates"
6. **Disable email confirmation** (for local dev):
   - Settings → Auth → "Enable email confirmations" → Toggle OFF
7. Click "Save"

#### 7. Run Database Migration

**Method A: Using Dashboard (Easiest)**
1. In Supabase Dashboard → "SQL Editor"
2. Click "New query"
3. Open `MIGRATION.sql` from your project
4. Copy ALL contents
5. Paste into SQL Editor
6. Click "RUN" (bottom right)
7. Should see: "Success. No rows returned"

**Method B: Using CLI**
```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your_project_id

# Push migration
supabase db push
```

#### 8. Verify Setup

Check these in Dashboard:

**Tables Created:**
- Go to "Table Editor"
- Should see: merchant_profiles, transactions, customer_profiles, etc.

**Auth Configured:**
- Go to "Authentication" → "Users"
- Should see empty list (ready for signups)

**Storage Ready:**
- Go to "Storage"
- Should see buckets section

#### 9. Install Supabase CLI (Optional but Recommended)

```bash
# Install globally
npm install -g supabase

# Login
supabase login

# Link project
supabase link --project-ref your_project_id

# Now you can:
supabase db push          # Push migrations
supabase functions deploy  # Deploy edge functions
supabase db dump          # Backup database
supabase gen types typescript # Generate TypeScript types
```

#### 10. Run Your App

```bash
npm install
npm run dev
```

Open `http://localhost:8080` - should work! ✅

### Managing Your Cloud Project

**View Data:**
- Dashboard → Table Editor → Select table → View rows

**View Auth Users:**
- Dashboard → Authentication → Users

**View Logs:**
- Dashboard → Logs → Select service (API, Auth, Database)

**SQL Queries:**
- Dashboard → SQL Editor → Write custom queries

**Monitor Usage:**
- Dashboard → Settings → Usage & Billing

### Deploy Edge Functions

```bash
# Deploy all functions
supabase functions deploy analyze-transaction
supabase functions deploy generate-test-transaction
supabase functions deploy ml-ensemble
supabase functions deploy ml-predict
supabase functions deploy send-webhook

# Or deploy all at once
for func in analyze-transaction generate-test-transaction ml-ensemble ml-predict send-webhook; do
  supabase functions deploy $func --no-verify-jwt
done
```

### Troubleshooting

**Issue: "Invalid project ref"**
```bash
# Check you're using correct project ID
supabase link --project-ref your_project_id
```

**Issue: "Authentication failed"**
```bash
# Relogin
supabase login
```

**Issue: "Migration failed"**
- Check SQL Editor for error message
- Make sure you copied ALL of MIGRATION.sql
- Try running in smaller chunks

**Issue: "Can't connect to database"**
- Check your internet connection
- Verify project is active in Dashboard
- Try refreshing dashboard

---

## Option C: Run Fully Local Supabase (Advanced) 🐳

### When to Use
- You want complete offline development
- You need fast iteration without API latency
- You're working on airplane/poor internet
- You want full control and privacy

### What You Get
- Complete Supabase stack running on your machine
- PostgreSQL database (localhost:54322)
- Auth server (localhost:54321)
- Storage server
- Realtime server
- REST API
- Full Supabase Studio GUI (localhost:54323)

### Prerequisites

**Required:**
- Docker Desktop installed and RUNNING
- 4GB RAM minimum (8GB recommended)
- 10GB free disk space

**Install Docker:**
- Windows/Mac: [Docker Desktop](https://www.docker.com/products/docker-desktop)
- Linux: `sudo apt install docker.io docker-compose`

**Verify Docker:**
```bash
docker --version    # Should show: Docker version 20.x.x
docker ps           # Should show: CONTAINER ID...
```

### Setup Steps

#### 1. Install Supabase CLI

```bash
# Install globally
npm install -g supabase

# Verify installation
supabase --version  # Should show: 1.x.x
```

#### 2. Initialize Supabase

```bash
# In your project root
cd /path/to/antifraudster
supabase init
```

This creates:
- `supabase/config.toml` - Configuration file
- `supabase/seed.sql` - Seed data (optional)
- `.gitignore` entries

#### 3. Start Local Supabase Stack

```bash
supabase start
```

**First time:**
- Downloads Docker images (~2GB)
- Takes 5-10 minutes
- Shows progress bars

**Output you'll see:**
```
Started supabase local development setup.

         API URL: http://localhost:54321
     GraphQL URL: http://localhost:54321/graphql/v1
          DB URL: postgresql://postgres:postgres@localhost:54322/postgres
      Studio URL: http://localhost:54323
    Inbucket URL: http://localhost:54324
      JWT secret: super-secret-jwt-token-with-at-least-32-characters-long
        anon key: eyJhbGci...
service_role key: eyJhbGci...
```

**SAVE THIS OUTPUT!** You'll need it.

#### 4. Update Environment Variables

Create/update `.env`:
```bash
VITE_SUPABASE_PROJECT_ID="local"
VITE_SUPABASE_PUBLISHABLE_KEY="[anon_key_from_supabase_start]"
VITE_SUPABASE_URL="http://localhost:54321"
```

Create `supabase/.env`:
```bash
SUPABASE_URL=http://localhost:54321
SUPABASE_ANON_KEY=[anon_key_from_supabase_start]
SUPABASE_SERVICE_ROLE_KEY=[service_role_key_from_supabase_start]
LOVABLE_API_KEY=la_your_api_key_here
```

#### 5. Apply Database Migration

```bash
# Reset DB and apply migration
supabase db reset

# This will:
# 1. Drop all existing tables
# 2. Apply migrations from supabase/migrations/
# 3. Run seed data if exists
```

**If migration not in migrations folder:**
```bash
# Create migration from MIGRATION.sql
supabase migration new initial_schema

# Copy contents of MIGRATION.sql into:
# supabase/migrations/[timestamp]_initial_schema.sql

# Apply it
supabase db reset
```

#### 6. Open Supabase Studio

Open browser to: `http://localhost:54323`

**No login required!** Full GUI access:
- Table Editor
- SQL Editor
- Auth Manager
- Storage Manager
- Database Settings

#### 7. Configure Auth (in Studio)

1. Go to Authentication → Settings
2. Set:
   ```
   Site URL: http://localhost:8080
   Disable email confirmation: ON
   ```
3. Save

#### 8. Run Your App

```bash
npm run dev
```

App runs on `http://localhost:8080` ✅

### Working with Local Supabase

**View Logs:**
```bash
# All services
supabase logs

# Specific service
supabase logs --service postgres
supabase logs --service auth
```

**Database Commands:**
```bash
# Create migration
supabase migration new my_migration_name

# Apply migrations
supabase db reset

# Dump database
supabase db dump -f backup.sql

# Restore database
psql postgresql://postgres:postgres@localhost:54322/postgres < backup.sql
```

**Edge Functions (Local):**
```bash
# Serve edge functions locally
supabase functions serve --env-file supabase/.env

# Deploy to local (not needed, auto-reloads)
# Just save the file, it hot-reloads!
```

**Stop/Start:**
```bash
# Stop all services
supabase stop

# Start again (fast - uses cached containers)
supabase start

# Restart specific service
supabase restart auth
```

**Check Status:**
```bash
# Show running containers
docker ps

# Show Supabase status
supabase status
```

### Access Points

| Service | URL | Purpose |
|---------|-----|---------|
| **API** | http://localhost:54321 | REST API endpoint |
| **Database** | postgresql://postgres:postgres@localhost:54322/postgres | Direct DB connection |
| **Studio** | http://localhost:54323 | Full dashboard GUI |
| **Inbucket** | http://localhost:54324 | Email testing (catches all emails) |

### Testing Emails Locally

All emails are caught by Inbucket:
1. Go to `http://localhost:54324`
2. See all emails sent by your app
3. Click to view (signup confirmations, password resets, etc.)

### Advantages of Local Setup

✅ **Blazing fast** - No network latency
✅ **Work offline** - Airplane, coffee shop, anywhere
✅ **Unlimited data** - No quotas or limits
✅ **Full control** - Tweak any config
✅ **Privacy** - Data never leaves your machine
✅ **Free** - No costs whatsoever

### Disadvantages

❌ **More setup** - Requires Docker, CLI
❌ **Local only** - Can't share with team easily
❌ **Resource intensive** - Uses 2-4GB RAM
❌ **Manual deploys** - Edge functions need manual testing

### Troubleshooting

**Issue: "Docker not running"**
```bash
# Start Docker Desktop (GUI)
# Or on Linux:
sudo systemctl start docker
```

**Issue: "Port already in use"**
```bash
# Check what's using port
lsof -i :54321

# Kill process or change Supabase port in config.toml
```

**Issue: "Migration failed"**
```bash
# Check logs
supabase logs --service postgres

# Reset everything
supabase stop
supabase start
supabase db reset
```

**Issue: "Can't connect to database"**
```bash
# Verify services are running
docker ps

# Should see containers:
# - supabase_db_*
# - supabase_auth_*
# - supabase_rest_*
# - supabase_storage_*
# - supabase_realtime_*
```

---

## Switching Between Options

### From Lovable Cloud → Your Own Cloud

1. Create Supabase project (Option B steps)
2. Update `.env` with new credentials
3. Run migration in new project
4. Restart app: `npm run dev`

### From Cloud → Local

1. Install Docker
2. Run `supabase start`
3. Update `.env` to use `localhost:54321`
4. Run `supabase db reset`
5. Restart app

### From Local → Cloud

1. Create Supabase project (Option B steps)
2. Export local data:
   ```bash
   supabase db dump -f backup.sql
   ```
3. Import to cloud:
   ```bash
   psql [cloud_connection_string] < backup.sql
   ```
4. Update `.env` with cloud credentials
5. Restart app

---

## Recommended Workflow

### For Learning/Quick Testing
→ **Use Option A (Lovable Cloud)**
- Zero setup, just code
- Perfect for tutorials

### For Serious Development
→ **Use Option C (Local) + Option B (Cloud)**
- Develop locally (fast, offline)
- Deploy to cloud (production, sharing)
- Best of both worlds!

### For Team Projects
→ **Use Option B (Supabase Cloud)**
- Everyone uses same cloud project
- Easy collaboration
- Shared data and auth

---

## Quick Reference Commands

### Option A (Lovable Cloud)
```bash
# Just run the app
npm run dev
```

### Option B (Supabase Cloud)
```bash
# Link project
supabase link --project-ref your_id

# Push changes
supabase db push

# Deploy functions
supabase functions deploy function-name
```

### Option C (Local Docker)
```bash
# Start
supabase start

# Stop
supabase stop

# Reset database
supabase db reset

# View logs
supabase logs

# Serve functions
supabase functions serve
```

---

## Need Help?

- **Supabase Docs**: https://supabase.com/docs
- **Supabase CLI Docs**: https://supabase.com/docs/reference/cli
- **Docker Docs**: https://docs.docker.com
- **Troubleshooting**: See `LOCAL_DEVELOPMENT_GUIDE.md`

---

## Summary

Choose the option that fits your needs:

| Your Situation | Best Option |
|----------------|-------------|
| "I just want it to work" | A: Lovable Cloud |
| "I'm building a real product" | B: Supabase Cloud |
| "I need offline development" | C: Local Docker |
| "I want everything" | C (local) + B (cloud) |

All options give you the **same functionality**. The only difference is where your data lives and how you manage it! 🚀
