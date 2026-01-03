# Project Walkthrough: Meta Lead Automation

## 1. Project Overview
The **Meta Lead Ads Automation System** is now fully generated. It includes:
- **Backend (Node.js)**: Handles Facebook Webhooks, processes leads, sends emails/WhatsApp, and manages data in MongoDB.
- **Frontend (React)**: Real-time dashboard to view leads, logs, KPIs, and perform retries.

## 2. Key Features Implemented
- [x] **Webhook Integration**: Verifies and receives leads from Meta Graph API.
- [x] **Auto-Response**:
    - **Email**: SendGrid integration (brochure attachment removed).
    - **WhatsApp**: Cloud API with template `lead_thank_you`.
- [x] **Admin Dashboard**:
    - Live updates via Socket.IO.
    - Search, Filter, and Export CSV.
    - Detailed logs for every email/WhatsApp attempt.
    - Manual Retry buttons.
- [x] **Security**: JWT Authentication for Admin.

## 3. How to Start
### Backend
1. Go to `/server`.
2. `npm install`.
3. Create `.env` from `.env.example` and fill keys.
4. Run `node seedAdmin.js` to create the admin user.
5. Run `npm run dev`.

### Frontend
1. Go to `/client`.
2. `npm install`.
3. Run `npm run dev`.
4. Open `http://localhost:3000` (or the port Vite shows).
5. Login with credentials from `.env` or `seedAdmin.js`.

## 4. Verification
- **Test Webhook**: Use Postman to POST to `http://localhost:4000/webhook` (simulating Meta).
- **Test Dashboard**: Open browser, see leads appear in real-time.
- **Test Export**: Click "Export CSV" to download lead data.
- **Test Retries**: Go to Lead Detail page and click Retry on failed messages.
