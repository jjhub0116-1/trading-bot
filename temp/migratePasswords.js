/**
 * One-time migration script: bcrypt-hash all existing plaintext passwords.
 * Run ONCE after deploying the bcrypt auth fix, before users try to log in.
 * Safe to run multiple times — skips already-hashed passwords.
 */
require('dotenv').config();
const connectDB = require('../config/db');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

async function migratePasswords() {
    await connectDB();
    console.log('\n🔐 Starting password migration...\n');

    const users = await User.find({});
    let migrated = 0, skipped = 0;

    for (const user of users) {
        // bcrypt hashes always start with $2b$ — skip already-hashed passwords
        if (user.password && user.password.startsWith('$2')) {
            console.log(`  ⏭️  User ${user.user_name} (${user.email}) — already hashed, skipping`);
            skipped++;
            continue;
        }

        const hashed = await bcrypt.hash(user.password, 12);
        await User.updateOne({ _id: user._id }, { password: hashed });
        console.log(`  ✅ User ${user.user_name} (${user.email}) — password hashed`);
        migrated++;
    }

    console.log(`\n✅ Migration complete: ${migrated} hashed, ${skipped} already done.`);
    console.log('   Users can now log in with their original passwords.\n');
    process.exit(0);
}

migratePasswords().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
});
