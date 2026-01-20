# 🚀 Deploying Meta SaaS Automation to Vercel

This guide will walk you through deploying your Meta SaaS Automation platform to Vercel step-by-step.

## 📋 Prerequisites

Before you begin, make sure you have:

1. ✅ A [Vercel account](https://vercel.com/signup) (free tier works)
2. ✅ A [MongoDB Atlas account](https://www.mongodb.com/cloud/atlas/register) (free tier available)
3. ✅ [Git](https://git-scm.com/) installed on your computer
4. ✅ [Node.js](https://nodejs.org/) 16+ installed
5. ✅ A [GitHub account](https://github.com/signup) (recommended for easier deployment)

---

## 🗄️ Step 1: Set Up MongoDB Atlas (Production Database)

Your local MongoDB won't work in production. You need a cloud database.

### 1.1 Create a MongoDB Atlas Cluster

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Sign up/login and create a **FREE** cluster
3. Choose **AWS** as provider and select a region close to you
4. Cluster name: `meta-saas-prod` (or any name you prefer)
5. Click **Create Cluster** (takes 3-5 minutes)

### 1.2 Create Database User

1. In Atlas, go to **Database Access** (left sidebar)
2. Click **Add New Database User**
3. Choose **Password** authentication
4. Username: `metaadmin` (or your choice)
5. Password: Generate a strong password (save it!)
6. Database User Privileges: **Read and write to any database**
7. Click **Add User**

### 1.3 Whitelist IP Addresses

1. Go to **Network Access** (left sidebar)
2. Click **Add IP Address**
3. Click **Allow Access from Anywhere** (for Vercel)
4. Confirm by clicking **Confirm**

> ⚠️ **Security Note**: For production, you should whitelist only Vercel's IP ranges, but "Allow from Anywhere" works for testing.

### 1.4 Get Connection String

1. Go to **Database** → Click **Connect** on your cluster
2. Choose **Connect your application**
3. Driver: **Node.js**, Version: **4.1 or later**
4. Copy the connection string. It looks like:
   ```
   mongodb+srv://metaadmin:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
5. Replace `<password>` with your actual database password
6. Add database name before the `?`: 
   ```
   mongodb+srv://metaadmin:yourpassword@cluster0.xxxxx.mongodb.net/meta-saas-prod?retryWrites=true&w=majority
   ```
7. **Save this connection string** - you'll need it for Vercel!

---

## 📦 Step 2: Prepare Your Project for Deployment

### 2.1 Update Client Environment File

The file `client/.env.production` has been created with a placeholder. After deployment, you'll update it with your actual Vercel URL.

### 2.2 Initialize Git Repository (if not already done)

Open PowerShell/Terminal in your project folder:

```powershell
cd "c:\Users\Ravi Grover\Downloads\Meta-SaaS-Automation--master\Meta-SaaS-Automation--master\Meta-SaaS-Automation--master"

# Initialize git if not already initialized
git init

# Add all files
git add .

# Commit
git commit -m "Prepare for Vercel deployment"
```

### 2.3 Push to GitHub (Recommended Method)

1. Go to [GitHub](https://github.com) and create a **New Repository**
2. Repository name: `meta-saas-automation`
3. Keep it **Private** (recommended for production code)
4. **Do NOT** initialize with README (your project already has one)
5. Click **Create Repository**

6. Push your code to GitHub:
```powershell
git remote add origin https://github.com/YOUR_USERNAME/meta-saas-automation.git
git branch -M main
git push -u origin main
```

---

## 🚀 Step 3: Deploy to Vercel

### Method A: Deploy via Vercel Dashboard (Easiest)

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **Add New** → **Project**
3. **Import Git Repository**: Select your GitHub repository
4. Click **Import**

5. **Configure Project**:
   - **Framework Preset**: Other
   - **Root Directory**: `./` (leave as is)
   - **Build Command**: Leave empty (Vercel will auto-detect)
   - **Output Directory**: Leave empty
   - **Install Command**: `npm install`

6. Click **Deploy** (this will fail initially - that's okay!)

### Method B: Deploy via Vercel CLI

```powershell
# Install Vercel CLI globally
npm install -g vercel

# Login to Vercel
vercel login

# Deploy
cd "c:\Users\Ravi Grover\Downloads\Meta-SaaS-Automation--master\Meta-SaaS-Automation--master\Meta-SaaS-Automation--master"
vercel
```

Follow the prompts:
- Set up and deploy? **Y**
- Which scope? Select your account
- Link to existing project? **N**
- Project name: `meta-saas-automation`
- In which directory is your code? `./`
- Want to override settings? **N**

---

## ⚙️ Step 4: Configure Environment Variables in Vercel

This is **CRITICAL** - your app won't work without these!

### 4.1 Go to Project Settings

1. In Vercel Dashboard, click on your project
2. Go to **Settings** → **Environment Variables**

### 4.2 Add Required Variables

Add each of these variables (click **Add** for each):

| Variable Name | Value | Notes |
|--------------|-------|-------|
| `MONGO_URI` | Your MongoDB Atlas connection string | From Step 1.4 |
| `JWT_SECRET` | Generate random 64-char string | Use: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `ENCRYPTION_KEY` | Any 32-character string | Example: `my-super-secret-key-32-chars!!` |
| `CLIENT_URL` | Your Vercel app URL | Example: `https://meta-saas-automation.vercel.app` |
| `NODE_ENV` | `production` | Exactly as shown |
| `PORT` | `4000` | Default port |

**Optional (for full functionality)**:

| Variable Name | Value | Where to Get |
|--------------|-------|--------------|
| `SENDGRID_API_KEY` | Your SendGrid API key | [SendGrid Dashboard](https://sendgrid.com/) |
| `META_ACCESS_TOKEN` | Facebook/Meta access token | [Meta for Developers](https://developers.facebook.com/) |
| `META_PHONE_ID` | WhatsApp Phone ID | Meta Business Manager |
| `META_BUSINESS_ID` | Meta Business ID | Meta Business Manager |
| `OPENAI_API_KEY` | OpenAI API key | [OpenAI Platform](https://platform.openai.com/) |
| `TWILIO_ACCOUNT_SID` | Twilio Account SID | [Twilio Console](https://www.twilio.com/console) |
| `TWILIO_AUTH_TOKEN` | Twilio Auth Token | Twilio Console |
| `TWILIO_PHONE_NUMBER` | Your Twilio phone number | Twilio Console |

> 💡 **Tip**: You can add the optional variables later. The app will work without them, but some features will be disabled.

### 4.3 Apply to All Environments

Make sure to select:
- ✅ Production
- ✅ Preview
- ✅ Development

Then click **Save**.

---

## 🔄 Step 5: Redeploy with Environment Variables

1. Go to **Deployments** tab
2. Click on the latest deployment
3. Click **⋯** (three dots) → **Redeploy**
4. Check **Use existing Build Cache**
5. Click **Redeploy**

Wait 2-3 minutes for deployment to complete.

---

## 🎯 Step 6: Update Client API URL

After deployment succeeds:

1. Copy your Vercel deployment URL (e.g., `https://meta-saas-automation.vercel.app`)
2. Update `client/.env.production`:
   ```env
   VITE_API_URL=https://meta-saas-automation.vercel.app/api
   ```
3. Commit and push:
   ```powershell
   git add client/.env.production
   git commit -m "Update production API URL"
   git push
   ```

Vercel will automatically redeploy!

---

## ✅ Step 7: Verify Deployment

### 7.1 Check if Site is Live

1. Visit your Vercel URL: `https://your-project-name.vercel.app`
2. You should see the login page

### 7.2 Test Login

Default admin credentials:
```
Email: admin@example.com
Password: admin123
```

> ⚠️ **IMPORTANT**: Change this password immediately after first login!

### 7.3 Check API Health

Visit: `https://your-project-name.vercel.app/api/`

You should see: `"Meta Lead Automation Server is Running"`

### 7.4 Check Vercel Function Logs

1. In Vercel Dashboard → **Functions** tab
2. Click on `/api/index.js`
3. Check for any errors in the logs

---

## 🐛 Troubleshooting

### Issue: "Application Error" or 500 Error

**Solution**: Check Vercel function logs for errors. Most common issues:
- Missing environment variables
- MongoDB connection string incorrect
- MongoDB Atlas IP not whitelisted

### Issue: "Cannot connect to database"

**Solution**:
1. Verify `MONGO_URI` in Vercel environment variables
2. Check MongoDB Atlas **Network Access** allows all IPs (`0.0.0.0/0`)
3. Verify database user has correct permissions

### Issue: Frontend loads but API calls fail

**Solution**:
1. Check `VITE_API_URL` in `client/.env.production`
2. Verify it points to your Vercel URL + `/api`
3. Check CORS settings in `server/server.js` - `CLIENT_URL` should match your Vercel URL

### Issue: "Function execution timed out"

**Solution**: Vercel free tier has 10-second timeout. Consider:
- Optimizing database queries
- Using Vercel Pro for 60-second timeout
- Moving long-running tasks to background jobs

---

## 🔐 Security Checklist

After deployment, verify:

- [ ] Changed default admin password
- [ ] `JWT_SECRET` is a strong random string
- [ ] `ENCRYPTION_KEY` is set
- [ ] `CLIENT_URL` is set to your actual Vercel URL (not `*`)
- [ ] MongoDB Atlas has proper user permissions
- [ ] All sensitive API keys are in Vercel environment variables (not in code)

---

## 📊 Post-Deployment Steps

### Set Up Custom Domain (Optional)

1. In Vercel Dashboard → **Settings** → **Domains**
2. Add your custom domain (e.g., `app.yourdomain.com`)
3. Follow Vercel's DNS configuration instructions
4. Update `CLIENT_URL` environment variable to your custom domain

### Enable Analytics

1. In Vercel Dashboard → **Analytics** tab
2. Enable **Web Analytics** (free)
3. Monitor traffic and performance

### Set Up Monitoring

1. Use Vercel's built-in monitoring
2. Consider adding [Sentry](https://sentry.io/) for error tracking
3. Set up uptime monitoring with [UptimeRobot](https://uptimerobot.com/)

---

## 🎉 Success!

Your Meta SaaS Automation platform is now live on Vercel! 

**Your URLs**:
- Frontend: `https://your-project-name.vercel.app`
- API: `https://your-project-name.vercel.app/api`

### Next Steps:

1. Configure your Meta/Facebook integration
2. Set up SendGrid for email notifications
3. Add team members
4. Start capturing leads!

---

## 📞 Need Help?

- **Vercel Docs**: https://vercel.com/docs
- **MongoDB Atlas Docs**: https://docs.atlas.mongodb.com/
- **Project Issues**: Check the project's GitHub issues

---

**Built with ❤️ for modern lead management**
