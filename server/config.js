require('dotenv').config();

module.exports = {
  port: process.env.PORT || 4000,
  mongoUri: process.env.MONGO_URI,
  sendgridApiKey: process.env.SENDGRID_API_KEY,
  smtp: {
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  senderEmail: process.env.RENDER_EMAIL || process.env.SMTP_USER, // Prefer env var, fallback to SMTP user
  facebook: {
    pageAccessToken: process.env.PAGE_ACCESS_TOKEN,
    verifyToken: process.env.VERIFY_TOKEN,
  },
  whatsapp: {
    phoneId: process.env.WHATSAPP_PHONE_ID,
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN,
  },
  ctaLink: process.env.CTA_LINK,
  jwtSecret: process.env.JWT_SECRET,
  admin: {
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
  },
  s3: {
    useS3: process.env.USE_S3 === 'true',
    bucket: process.env.S3_BUCKET,
    accessKey: process.env.S3_ACCESS_KEY,
    secretKey: process.env.S3_SECRET_KEY,
  }
};
