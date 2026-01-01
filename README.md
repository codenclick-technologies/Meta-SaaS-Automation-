# Meta Automation - Lead Management System

🚀 **Advanced Lead Automation Platform with AI-powered scoring, multi-channel communication, and real-time analytics.**

---

## ✨ Features

### 🎯 Core Features
- ✅ **Facebook Lead Ads Integration** - Auto-capture leads from FB campaigns
- ✅ **Multi-Channel Automation** - Email, WhatsApp, SMS in one platform
- ✅ **AI Lead Scoring** - OpenAI-powered quality analysis
- ✅ **Real-time Dashboard** - Live stats with Socket.io
- ✅ **Team Management** - Role-based access control
- ✅ **Advanced Analytics** - Conversion tracking, heat maps
- ✅ **Drip Campaigns** - Automated follow-up sequences
- ✅ **Custom Fields** - Dynamic lead data capture

### 🤖 AI & Automation
- Smart lead quality scoring (0-100)
- Automatic email/WhatsApp responses
- Duplicate detection
- Lead assignment automation
- Spam filtering

### 📊 Analytics & Reporting
- Real-time conversion funnels
- Channel performance metrics
- User performance tracking
- Export to CSV/Excel
- Custom date range filtering

---

## 🛠️ Tech Stack

### Frontend
- **React 18** + Vite
- **TailwindCSS** - Modern UI
- **Framer Motion** - Smooth animations
- **Recharts** - Data visualization
- **Socket.io Client** - Real-time updates
- **Lucide React** - Beautiful icons

### Backend
- **Node.js** + Express
- **MongoDB** + Mongoose
- **Socket.io** - WebSocket support
- **JWT** - Authentication
- **Bull** - Job queues (optional)
- **Redis** - Caching (optional)

### Integrations
- **SendGrid** - Email delivery
- **Meta WhatsApp API** - WhatsApp messaging
- **Twilio** - SMS service
- **OpenAI** - AI scoring
- **Facebook Webhooks** - Lead capture

---

## 🚀 Quick Start

### Prerequisites
```bash
Node.js 16+ 
MongoDB 5+
npm or yarn
```

### Installation

1. **Clone Repository**
```bash
git clone https://github.com/YOUR_USERNAME/meta-automation.git
cd meta-automation
```

2. **Backend Setup**
```bash
cd server
npm install
cp .env.example .env
# Edit .env with your credentials
npm run dev
```

3. **Frontend Setup**
```bash
cd client
npm install
cp .env.example .env
# Edit .env with backend URL
npm run dev
```

4. **Access Application**
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:4000`

### Default Admin Login
```
Email: admin@example.com
Password: admin123
```
⚠️ **Change immediately after first login!**

---

## 📁 Project Structure

```
meta-automation/
├── client/                 # React Frontend
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── services/      # API calls
│   │   └── design-system.css
│   └── package.json
│
├── server/                # Node.js Backend
│   ├── models/           # Mongoose schemas
│   ├── routes/           # API routes
│   ├── services/         # Business logic
│   ├── middleware/       # Auth, validation
│   └── server.js
│
└── README.md
```

---

## 🔧 Configuration

### Environment Variables

#### Server (.env)
```env
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/meta-automation
JWT_SECRET=your_super_secret_key
PORT=4000

# Email
SENDGRID_API_KEY=your_key
EMAIL_FROM=noreply@yourdomain.com

# WhatsApp
META_ACCESS_TOKEN=your_token
META_PHONE_ID=your_phone_id
META_BUSINESS_ID=your_business_id

# AI Scoring (Optional)
OPENAI_API_KEY=sk-your-key
```

#### Client (.env)
```env
VITE_API_URL=http://localhost:4000
```

---

## 📖 API Documentation

### Authentication
```bash
POST /auth/login
POST /auth/register
GET  /auth/me
PUT  /auth/profile
```

### Leads
```bash
GET    /leads              # Get all leads
POST   /leads              # Create lead
GET    /leads/:id          # Get single lead
PUT    /leads/:id          # Update lead
DELETE /leads/:id          # Delete lead
POST   /leads/assign-batch # Bulk assign
```

### Users (Admin only)
```bash
GET    /users/team         # Get team members
POST   /users              # Create user
DELETE /users/:id          # Delete user
```

### Analytics
```bash
GET /analytics/stats       # Dashboard stats
GET /analytics/team        # Team performance
GET /analytics/conversion  # Conversion funnel
```

---

## 🎨 UI Features

- 🌈 Modern gradient design
- 🎭 Smooth animations (Framer Motion)
- 📱 Fully responsive
- ♿ Accessibility compliant
- 🌙 Professional color scheme
- 🔔 Real-time toast notifications
- ⚡ Instant search & filters

---

## 🚢 Deployment

### Option 1: Render.com (Recommended)
1. Push code to GitHub
2. Connect to Render
3. Deploy backend + frontend
4. Add environment variables

**Detailed guide:** See `DEPLOYMENT_GUIDE.md`

### Option 2: VPS/DigitalOcean
```bash
# Server setup
npm install -g pm2
pm2 start server/server.js
pm2 save

# Frontend build
cd client
npm run build
# Serve with Nginx
```

---

## 🔐 Security Features

- ✅ JWT authentication
- ✅ Password hashing (bcrypt)
- ✅ Rate limiting
- ✅ Input validation
- ✅ XSS protection
- ✅ CORS configuration
- ✅ Environment variable encryption
- ✅ SQL injection prevention (MongoDB)

---

## 📊 Performance

- ⚡ Virtual scrolling for large datasets
- 🚀 Lazy loading components
- 💾 Redis caching (optional)
- 📦 Code splitting
- 🗜️ Gzip compression
- 🎯 Optimized database queries

---

## 🧪 Testing

```bash
# Backend tests
cd server
npm test

# Frontend tests
cd client
npm test
```

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

---

## 📝 Changelog

### v1.0.0 (2024-12-31)
- ✨ Initial release
- 🎨 Modern UI with animations
- 🤖 AI-powered lead scoring
- 📊 Real-time analytics dashboard
- 📧 Multi-channel automation
- 👥 Team management
- 🔐 Secure authentication

---

## 🐛 Known Issues

- Free tier Render backend sleeps after 15 min inactivity
- WhatsApp requires approved Meta Business account
- AI scoring requires OpenAI API credits

---

## 📄 License

MIT License - See LICENSE file for details

---

## 👨‍💻 Author

**Your Name**
- GitHub: [@YOUR_USERNAME](https://github.com/YOUR_USERNAME)
- Email: your.email@example.com

---

## 🙏 Acknowledgments

- React Team for amazing framework
- TailwindCSS for utility-first CSS
- MongoDB for flexible database
- OpenAI for AI capabilities
- All open-source contributors

---

## 📞 Support

- 📧 Email: support@yourdomain.com
- 💬 Discord: [Join Community](https://discord.gg/your-invite)
- 📚 Docs: [Documentation](https://docs.yourdomain.com)
- 🐛 Issues: [GitHub Issues](https://github.com/YOUR_USERNAME/meta-automation/issues)

---

## ⭐ Star Us!

If you find this project useful, please give it a star ⭐ on GitHub!

---

**Built with ❤️ for modern lead management**
