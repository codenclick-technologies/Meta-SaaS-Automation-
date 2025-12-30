# WKPC Meta Automation + Real-time Admin Dashboard

## Project Overview
This project automates the processing of Meta Lead Ads. It receives leads via Webhooks, sends welcome emails (with brochure) and WhatsApp messages, and provides a real-time Admin Dashboard.

## Features
- **Lead Capture**: Receives real-time leads from Facebook Graph API.
- **Auto Responder**:
    - Email: SendGrid (primary) with PDF attachment.
    - WhatsApp: WhatsApp Cloud API.
- **Data Storage**: MongoDB.
- **Admin Dashboard**:
    - Real-time updates (Socket.IO).
    - Retry mechanism for failed messages.
    - Export to CSV.
    - Logs for every action.

## Tech Stack
- **Backend**: Node.js, Express, MongoDB, Socket.IO
- **Frontend**: React (Vite), Tailwind CSS
- **Frontend**: React (Vite), Tailwind CSS
- **Services**: SendGrid, WhatsApp Cloud API

## How it Works
1.  **Lead Capture**
    - A user clicks on your Facebook Ad and fills out the "Instant Form".
    - Facebook sends this data instantly to your Server URL (`/webhook`).

2.  **Processing (Server)**
    - The Server receives the data and saves it to your **MongoDB Database**.
    - It immediately triggers two actions:
        - **Email**: Sends a "Welcome Email" via **SendGrid**.
        - **WhatsApp**: Sends a "Thank You" message via **WhatsApp Cloud API**.

3.  **Real-time Dashboard**
    - Your **React Dashboard** is connected to the server via **Socket.IO**.
    - As soon as the server saves the lead, the Dashboard **beeps** and shows the new row instantly (no refresh needed).

## Setup Instructions

### Prerequisites
- Node.js (v16+)
- MongoDB Atlas URI
- SendGrid API Key
- Meta Developer App (for WhatsApp & Webhooks)

### Installation
1. **Clone & Install Dependencies**
   ```bash
   # Server
   cd project/server
   npm install

   # Client
   cd ../client
   npm install
   ```

2. **Environment Configuration**
   Copy `project/.env.example` to `project/server/.env` and fill in the values.

3. **Running Locally**
   ```bash
   # Start Backend (Port 4000)
   cd project/server
   npm run dev

   # Start Frontend
   cd project/client
   npm run dev
   ```

### Webhook Setup
1. Expose your local server using ngrok: `ngrok http 4000`
2. Configure Facebook Webhook Callback URL: `https://your-ngrok-url/webhook`
3. Verify Token: `your_verify_token` defined in `.env`.

### WhatsApp Setup
1. Create a template named `lead_thank_you` in Meta Business Manager.
2. Body: `Hi {{1}}, thank you for contacting us. Book a call: {{2}}`

## Deployment
- **Backend**: Render, Railway, or Heroku.
- **Frontend**: Vercel, Netlify.
