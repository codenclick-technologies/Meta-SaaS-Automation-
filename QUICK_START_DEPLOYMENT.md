# 🚀 Quick Start - Deploy to Vercel (Manual Method)

Since Node.js and Git are not installed on your system, here's the **easiest way** to deploy:

## Option 1: Install Required Tools First (Recommended)

### Step 1: Install Node.js
1. Download Node.js from: https://nodejs.org/
2. Choose **LTS version** (recommended)
3. Run the installer and follow the prompts
4. Restart your computer after installation

### Step 2: Install Git
1. Download Git from: https://git-scm.com/download/win
2. Run the installer
3. Use default settings (just keep clicking "Next")
4. Restart your computer after installation

### Step 3: Deploy Using Vercel CLI
After installing Node.js and Git, open PowerShell and run:

```powershell
# Navigate to your project
cd "c:\Users\Ravi Grover\Downloads\Meta-SaaS-Automation--master\Meta-SaaS-Automation--master\Meta-SaaS-Automation--master"

# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy!
vercel
```

Follow the prompts:
- **Set up and deploy?** → Y
- **Which scope?** → Select your account
- **Link to existing project?** → N
- **Project name** → meta-saas-automation
- **In which directory is your code?** → ./
- **Want to override settings?** → N

---

## Option 2: Deploy via Vercel Dashboard (No Installation Required)

### Step 1: Create a GitHub Account & Repository

1. **Create GitHub Account**: https://github.com/signup
2. **Install GitHub Desktop**: https://desktop.github.com/
3. **Open GitHub Desktop** and sign in
4. Click **File** → **Add Local Repository**
5. Browse to: `c:\Users\Ravi Grover\Downloads\Meta-SaaS-Automation--master\Meta-SaaS-Automation--master\Meta-SaaS-Automation--master`
6. Click **Create Repository** if prompted
7. Click **Publish Repository**
   - Name: `meta-saas-automation`
   - Keep it **Private** ✓
   - Click **Publish Repository**

### Step 2: Deploy to Vercel

1. **Go to Vercel**: https://vercel.com/signup
2. **Sign up with GitHub** (click "Continue with GitHub")
3. Authorize Vercel to access your GitHub
4. Click **Add New** → **Project**
5. **Import** your `meta-saas-automation` repository
6. Click **Import**
7. **Configure Project**:
   - Framework Preset: **Other**
   - Root Directory: `./`
   - Build Command: (leave empty)
   - Output Directory: (leave empty)
8. Click **Deploy**

### Step 3: Add Environment Variables

The deployment will fail initially - that's expected! Now add environment variables:

1. Go to your project in Vercel Dashboard
2. Click **Settings** → **Environment Variables**
3. Add these variables (see VERCEL_DEPLOYMENT.md for full list):

**Required Variables:**
- `MONGO_URI` → Your MongoDB Atlas connection string
- `JWT_SECRET` → Random 64-character string
- `ENCRYPTION_KEY` → Any 32-character string
- `CLIENT_URL` → Your Vercel app URL (e.g., https://meta-saas-automation.vercel.app)
- `NODE_ENV` → production
- `PORT` → 4000

4. Click **Deployments** → Click latest deployment → **Redeploy**

---

## Option 3: Use Vercel's Drag & Drop (Simplest, but Limited)

1. Go to: https://vercel.com/new
2. Sign up/login
3. Instead of importing from Git, look for **"Or, deploy a template"**
4. You can drag and drop your project folder

⚠️ **Note**: This method is less ideal because:
- You can't easily update your deployment
- No version control
- Harder to manage

---

## 🎯 Recommended Path

**For best results, I recommend Option 1** (installing Node.js and Git). This gives you:
- ✅ Full control over deployments
- ✅ Easy updates and rollbacks
- ✅ Professional workflow
- ✅ Version control with Git

**Time required**: ~15 minutes for installation + 5 minutes for deployment

---

## 📞 Need Help?

Refer to the complete guide: **VERCEL_DEPLOYMENT.md**

Or follow these quick links:
- Node.js: https://nodejs.org/
- Git: https://git-scm.com/download/win
- GitHub Desktop: https://desktop.github.com/
- Vercel: https://vercel.com/
- MongoDB Atlas: https://www.mongodb.com/cloud/atlas

---

**Next Steps After Deployment:**
1. Set up MongoDB Atlas database
2. Configure environment variables in Vercel
3. Update `client/.env.production` with your Vercel URL
4. Test your deployed application!
