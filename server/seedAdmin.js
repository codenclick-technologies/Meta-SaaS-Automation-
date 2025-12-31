require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('./models/Admin');

const seedAdmin = async () => {
    try {
        // Connect to Database
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected...');

        // Check if admin already exists
        const email = 'admin@example.com'; // Change this email
        const password = 'admin123';    // Change this password

        const adminExists = await Admin.findOne({ email });

        if (adminExists) {
            console.log('Admin user already exists!');
            process.exit();
        }

        // Create new Admin
        const admin = new Admin({
            name: 'Super Admin',
            email: email,
            password: password, // Model will automatically hash this
            role: 'admin'
        });

        await admin.save();
        console.log(`Admin created successfully!\nEmail: ${email}\nPassword: ${password}`);
        process.exit();
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
};

seedAdmin();