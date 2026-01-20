# 🗄️ MongoDB Atlas Production Setup Guide

## समस्या (Problem)
जब आप अपना application live करेंगे (Vercel/Railway/Render पर deploy करेंगे), तो आपको MongoDB Atlas से connect करना होगा। यह guide आपको step-by-step बताएगी कि production में database कैसे connect करें।

---

## 📋 Table of Contents
1. [MongoDB Atlas Setup](#step-1-mongodb-atlas-setup)
2. [IP Whitelist Configuration](#step-2-ip-whitelist-configuration)
3. [Connection String Setup](#step-3-connection-string-setup)
4. [Vercel Environment Variables](#step-4-vercel-environment-variables)
5. [Testing Connection](#step-5-testing-connection)
6. [Troubleshooting](#troubleshooting)

---

## Step 1: MongoDB Atlas Setup

### 1.1 Create MongoDB Atlas Account
1. Visit: https://www.mongodb.com/cloud/atlas/register
2. Sign up करें (Free tier available - कोई payment नहीं चाहिए)
3. Email verify करें

### 1.2 Create a New Cluster
1. Dashboard में जाएं
2. **"Build a Database"** पर click करें
3. **FREE tier (M0)** select करें - यह completely free है
4. **Cloud Provider** select करें:
   - AWS (recommended)
   - Region: अपने users के पास का region चुनें (e.g., Mumbai for India)
5. Cluster Name: `meta-saas-cluster` (या कोई भी नाम)
6. **"Create"** button पर click करें
7. Wait करें 3-5 minutes (cluster create हो रहा है)

---

## Step 2: IP Whitelist Configuration

> [!IMPORTANT]
> यह सबसे important step है! अगर IP whitelist सही नहीं है, तो production में database connect नहीं होगा।

### 2.1 Allow All IPs (Production के लिए)
1. Left sidebar में **"Network Access"** पर click करें
2. **"Add IP Address"** button पर click करें
3. **"Allow Access from Anywhere"** select करें
   - यह automatically `0.0.0.0/0` add कर देगा
   - यह Vercel/Railway जैसे serverless platforms के लिए जरूरी है
4. **"Confirm"** पर click करें

> [!WARNING]
> `0.0.0.0/0` का मतलब है कि कोई भी IP address connect कर सकता है। लेकिन चिंता मत करो - आपका database username/password से protected है।

### 2.2 Alternative: Specific IPs (Optional)
अगर आप specific IPs allow करना चाहते हैं:
- Vercel के लिए: https://vercel.com/docs/concepts/edge-network/regions
- Railway के लिए: https://docs.railway.app/reference/public-networking

---

## Step 3: Connection String Setup

### 3.1 Create Database User
1. Left sidebar में **"Database Access"** पर click करें
2. **"Add New Database User"** पर click करें
3. **Authentication Method**: Password
4. **Username**: `metaadmin` (या कोई भी)
5. **Password**: एक strong password बनाएं
   - Example: `MySecure@Pass123`
   - **Important**: इसे कहीं save कर लें!
6. **Database User Privileges**: `Atlas admin` या `Read and write to any database`
7. **"Add User"** पर click करें

### 3.2 Get Connection String
1. Left sidebar में **"Database"** पर click करें
2. अपने cluster के सामने **"Connect"** button पर click करें
3. **"Connect your application"** select करें
4. **Driver**: Node.js
5. **Version**: 4.1 or later
6. Connection string copy करें:

```
mongodb+srv://metaadmin:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
```

### 3.3 Modify Connection String
Connection string में changes करें:

**Before:**
```
mongodb+srv://metaadmin:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
```

**After:**
```
mongodb+srv://metaadmin:MySecure@Pass123@cluster0.xxxxx.mongodb.net/meta-saas-prod?retryWrites=true&w=majority
```

Changes:
1. `<password>` को अपने actual password से replace करें
2. Database name add करें: `/meta-saas-prod` (या कोई भी नाम)

> [!CAUTION]
> Password में special characters (`@`, `#`, `$`, etc.) हैं तो उन्हें URL encode करें:
> - `@` → `%40`
> - `#` → `%23`
> - `$` → `%24`
> 
> Example: `Pass@123` → `Pass%40123`

---

## Step 4: Vercel Environment Variables

### 4.1 Add to Vercel Dashboard
1. Vercel dashboard में जाएं: https://vercel.com/dashboard
2. अपना project select करें
3. **Settings** tab पर जाएं
4. Left sidebar में **"Environment Variables"** पर click करें
5. नया variable add करें:

| Name | Value |
|------|-------|
| `MONGO_URI` | `mongodb+srv://metaadmin:MySecure@Pass123@cluster0.xxxxx.mongodb.net/meta-saas-prod?retryWrites=true&w=majority` |

6. **Environment**: सभी select करें (Production, Preview, Development)
7. **"Save"** पर click करें

### 4.2 Redeploy
Environment variable add करने के बाद:
1. **Deployments** tab पर जाएं
2. Latest deployment के सामने **"..."** (three dots) पर click करें
3. **"Redeploy"** select करें
4. **"Redeploy"** confirm करें

---

## Step 5: Testing Connection

### 5.1 Check Deployment Logs
1. Vercel dashboard में deployment पर click करें
2. **"View Function Logs"** या **"Runtime Logs"** देखें
3. Success message देखना चाहिए:
   ```
   MongoDB Connected Successfully
   ```

### 5.2 Test API Endpoint
Browser में अपना deployed URL खोलें:
```
https://your-app.vercel.app/
```

Response आना चाहिए:
```
Meta Lead Automation Server is Running
```

### 5.3 Test Database Write
1. अपने app में login करें
2. कोई test lead create करें
3. MongoDB Atlas dashboard में check करें:
   - **Database** → **Browse Collections**
   - `meta-saas-prod` database में data दिखना चाहिए

---

## 🔧 Troubleshooting

### Error: "MongoDB Connection FAILED"

#### Possible Causes:
1. ❌ IP whitelist में `0.0.0.0/0` नहीं है
2. ❌ Connection string में password गलत है
3. ❌ Database user create नहीं किया
4. ❌ Vercel में `MONGO_URI` environment variable नहीं है

#### Solutions:

**1. Check IP Whitelist**
```
MongoDB Atlas → Network Access → Verify 0.0.0.0/0 है
```

**2. Verify Connection String**
```bash
# Test locally first
MONGO_URI="your-connection-string" node server/server.js
```

**3. Check Database User**
```
MongoDB Atlas → Database Access → User exists with correct permissions
```

**4. Verify Environment Variable**
```
Vercel → Settings → Environment Variables → MONGO_URI exists
```

---

### Error: "MongoServerError: bad auth"

**Problem**: Username या password गलत है

**Solution**:
1. MongoDB Atlas → Database Access
2. User के सामने **"Edit"** पर click करें
3. Password reset करें
4. नया password connection string में update करें
5. Vercel environment variable update करें
6. Redeploy करें

---

### Error: "Connection timeout"

**Problem**: IP whitelist में Vercel का IP नहीं है

**Solution**:
1. MongoDB Atlas → Network Access
2. **"Add IP Address"** → **"Allow Access from Anywhere"**
3. `0.0.0.0/0` add करें
4. Wait करें 2-3 minutes
5. Vercel पर redeploy करें

---

## 📊 Production Best Practices

### 1. Separate Databases
Development और production के लिए अलग databases use करें:

**Development:**
```
mongodb+srv://user:pass@cluster.net/meta-saas-dev
```

**Production:**
```
mongodb+srv://user:pass@cluster.net/meta-saas-prod
```

### 2. Connection Pooling
आपका code already optimized है (mongoose automatically handle करता है):
```javascript
mongoose.connect(config.mongoUri)
```

### 3. Monitor Database
MongoDB Atlas dashboard में:
- **Metrics** tab: CPU, Memory, Connections देखें
- **Alerts**: Setup करें for high usage
- **Performance Advisor**: Recommendations देखें

### 4. Backup Strategy
Free tier में automatic backups नहीं हैं, लेकिन:
1. Regular exports लें (MongoDB Compass use करें)
2. या paid tier upgrade करें for automatic backups

---

## 🎯 Quick Reference

### Connection String Format
```
mongodb+srv://<username>:<password>@<cluster-url>/<database-name>?retryWrites=true&w=majority
```

### Environment Variable
```bash
MONGO_URI=mongodb+srv://metaadmin:password@cluster0.xxxxx.mongodb.net/meta-saas-prod?retryWrites=true&w=majority
```

### Vercel Deployment
```bash
# After adding MONGO_URI to Vercel
vercel --prod
```

---

## 📞 Support Resources

- **MongoDB Atlas Docs**: https://docs.atlas.mongodb.com/
- **Vercel Docs**: https://vercel.com/docs
- **Mongoose Docs**: https://mongoosejs.com/docs/

---

## ✅ Deployment Checklist

- [ ] MongoDB Atlas cluster created
- [ ] Database user created with password
- [ ] IP whitelist set to `0.0.0.0/0`
- [ ] Connection string copied and modified
- [ ] `MONGO_URI` added to Vercel environment variables
- [ ] Application redeployed on Vercel
- [ ] Logs checked for "MongoDB Connected Successfully"
- [ ] Test data created and verified in Atlas dashboard

---

**अब आपका application production में MongoDB Atlas से connect हो जाएगा! 🎉**
