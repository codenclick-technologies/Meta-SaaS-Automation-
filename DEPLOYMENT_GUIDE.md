# Enterprise Deployment Guide (Meta SaaS Automation)

This guide details how to transform the **Meta SaaS Automation** project from a `localhost` development environment to a production-ready enterprise application. This process removes all "fake" local references and prepares the system for real-world sales and deployment.

---

## 1. Production Architecture Overview

In a production environment, the "fake" `localhost` URLs are replaced with real domain names.

*   **Frontend (Client)**: Hosted on a CDN (e.g., Vercel, Netlify, AWS CloudFront).
    *   *Dev URL*: `http://localhost:3000`
    *   *Prod URL*: `https://app.your-enterprise.com`
*   **Backend (Server)**: Hosted on a scalable server (e.g., AWS EC2, DigitalOcean, Heroku).
    *   *Dev URL*: `http://localhost:4000`
    *   *Prod URL*: `https://api.your-enterprise.com`
*   **Database**: Managed MongoDB Cluster (e.g., MongoDB Atlas).

---

## 2. Server Configuration (Backend)

The server communicates via Environment Variables. You must create a secure `.env` file on your production server.

### **Required Environment Variables (`.env`)**

```env
# Server Port
PORT=4000

# Database (Use a real MongoDB Atlas URI, not localhost)
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/meta-saas-prod?retryWrites=true&w=majority

# Security Secrets (Generate random 64-char strings for these)
JWT_SECRET=production_secret_key_change_this_immediately
ENCRYPTION_KEY=production_aes_key_32_chars_exactly!!

# CORS Configuration (Critical for Enterprise Security)
# Only allow requests from your frontend domain
CLIENT_URL=https://app.your-enterprise.com

# Integration Secrets (Optional: Can now be managed via "Secret Vault" in UI)
# Leave these blank if you want admins to add them via the Dashboard
SENDGRID_API_KEY=
WHATSAPP_ACCESS_TOKEN=
```

### **Steps to Deploy Server:**
1.  Upload the `server/` folder to your cloud provider.
2.  Install dependencies: `npm install --production`.
3.  Set the environment variables listed above in your cloud dashboard.
4.  Start the app: `npm start`.

---

## 3. Client Configuration (Frontend)

The React frontend needs to know where the production API lives.

### **1. Configure Production API URL**
Create a file named `.env.production` inside the `client/` folder:

```env
# Point this to your live backend domain
VITE_API_URL=https://api.your-enterprise.com
```

### **2. Build for Production**
Run the build command to generate optimized static files:

```bash
cd client
npm install
npm run build
```

This creates a `dist/` folder. **This folder is what you sell.** You upload the contents of `dist/` to any hosting provider (Vercel, Netlify, KeyCDN).

---

## 4. How to "Sell" This Project

When delivering this to an enterprise client, you are handing over a **White-Labelled Solution**.

1.  **Database Isolation**:
    *   Use the `MONGO_URI` to point to a dedicated database for that client. They own their data.
2.  **Secret Vault**:
    *   Tell the client: *"We do not hardcode your API keys. Go to **Security > Secret Vault** and enter your own Meta/WhatsApp keys. They are encrypted at rest."*
    *   This features proves it is NOT a "fake" project. Hardcoded keys = Fake. Dynamic Vault = Enterprise.
3.  **Domain Mapping**:
    *   Use the **Branding Control** tab (in Security page) to let them set `app.their-company.com`.

---

## 5. Verification Checklist

- [ ] **Database**: Connected to MongoDB Atlas (Check: User data persists after restart).
- [ ] **Security**: `ENCRYPTION_KEY` is set and `Secret Vault` encrypts data in DB.
- [ ] **CORS**: `CLIENT_URL` restricts access to only the production frontend.
- [ ] **HTTPS**: Both frontend and backend are served over SSL (https://).
- [ ] **Logs**: `npm run dev` is NOT used. Use PM2 or Docker for process management.

**Your project is now an Enterprise-Grade SaaS Platform.**
