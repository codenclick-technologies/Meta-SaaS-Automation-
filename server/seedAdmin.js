require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Organization = require('./models/Organization');

const seedAdminLogic = async (User, Organization) => {
    const email = 'admin@example.com';
    const password = 'admin123';
    const orgName = 'Default Organization';
    const testFormId = 'FORM_123456789'; // Matches simulation script

    // 1. Find or Create Organization
    let org = await Organization.findOne({ name: orgName });
    if (!org) {
        org = new Organization({
            name: orgName,
            facebookFormIds: [testFormId] // Add test form ID on creation
        });
        await org.save();
        console.log('Organization created:', orgName);
    } else {
        // Ensure the test form ID exists for the default org
        if (!org.facebookFormIds.includes(testFormId)) {
            org.facebookFormIds.push(testFormId);
            await org.save();
            console.log(`Added test form ID to ${orgName}`);
        }
    }

    // 2. Check if user already exists
    let user = await User.findOne({ email });

    if (user) {
        console.log('User already exists, updating to Admin...');
        user.role = 'admin';
        user.organizationId = org._id;
        // Update password just in case
        user.password = password;
        await user.save();
    } else {
        // 3. Create new Admin User
        user = new User({
            name: 'Super Admin',
            email: email,
            password: password,
            role: 'admin',
            organizationId: org._id
        });
        await user.save();
        console.log('Admin user created successfully!');
    }

    // 4. Ensure user is in Organization's user list
    if (!org.users.includes(user._id)) {
        org.users.push(user._id);
        await org.save();
        console.log('Linked user to organization.');
    }

    console.log(`\nLOGIN CREDENTIALS:`);
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);

    return { user, org };
};

const runSeed = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected...');
        await seedAdminLogic(User, Organization);
        process.exit(0);
    } catch (error) {
        console.error('Error seeding admin:', error.message);
        process.exit(1);
    }
}

// Execute only if run as a script
if (require.main === module) {
    runSeed();
}

module.exports = { seedAdminLogic };