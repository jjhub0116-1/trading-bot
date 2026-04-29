const bcrypt = require('bcryptjs');
const User = require('../models/User');

async function generateUserId() {
    // Generate a simple unique user_id based on count
    const count = await User.countDocuments();
    return count + 101; // Start at 101 to avoid test user collisions
}

exports.createAdmin = async (req, res) => {
    try {
        const { user_name, email, password, equity_lot_limit, loss_limit } = req.body;
        
        const existing = await User.findOne({ email });
        if (existing) return res.status(400).send({ error: 'Email already in use' });

        const hashedPassword = await bcrypt.hash(password, 12);
        const nextId = await generateUserId();

        const admin = new User({
            user_id: nextId,
            user_name,
            email,
            password: hashedPassword,
            role: 'admin',
            equity_lot_limit: equity_lot_limit || 0,
            loss_limit: loss_limit || 500,
            created_by: req.user.id
        });
        await admin.save();
        
        // Remove password from response
        const adminResponse = admin.toObject();
        delete adminResponse.password;
        res.status(201).send(adminResponse);
    } catch (error) {
        console.error('Create admin error:', error);
        res.status(400).send({ error: error.message });
    }
};

exports.createUser = async (req, res) => {
    try {
        const { user_name, email, password, equity, loss_limit, can_trade_stocks, can_trade_commodities } = req.body;
        
        // Find admin using their custom user_id (not ObjectId)
        const admin = await User.findOne({ user_id: req.user.id });
        if (!admin) return res.status(404).send({ error: 'Admin not found' });

        if (admin.equity_lot_limit < equity) {
            return res.status(400).send({ error: 'Equity exceeds admin lot limit' });
        }

        if (admin.loss_limit < loss_limit) {
            return res.status(400).send({ error: 'Loss limit exceeds admin limit' });
        }

        const existing = await User.findOne({ email });
        if (existing) return res.status(400).send({ error: 'Email already in use' });

        const hashedPassword = await bcrypt.hash(password, 12);
        const nextId = await generateUserId();

        const user = new User({
            user_id: nextId,
            user_name,
            email,
            password: hashedPassword,
            role: 'user',
            equity: equity || 5000,
            loss_limit: loss_limit || 500,
            can_trade_stocks: can_trade_stocks !== undefined ? can_trade_stocks : true,
            can_trade_commodities: can_trade_commodities !== undefined ? can_trade_commodities : true,
            created_by: req.user.id
        });

        // Deduct from admin limits
        admin.equity_lot_limit -= equity;
        // Optionally deduct loss_limit here if the requirement implies it.
        // admin.loss_limit -= loss_limit; 
        await admin.save();

        await user.save();
        
        const userResponse = user.toObject();
        delete userResponse.password;
        res.status(201).send(userResponse);
    } catch (error) {
        console.error('Create user error:', error);
        res.status(400).send({ error: error.message });
    }
};

exports.updateUser = async (req, res) => {
    try {
        const { userId } = req.params; // Custom user_id
        const updates = req.body;
        
        const admin = await User.findOne({ user_id: req.user.id });
        const user = await User.findOne({ user_id: userId, created_by: req.user.id });

        if (!admin || !user) {
            return res.status(404).send({ error: 'User not found or you do not have permission' });
        }

        if (updates.equity !== undefined) {
            const equityDifference = updates.equity - user.equity;
            if (admin.equity_lot_limit < equityDifference) {
                return res.status(400).send({ error: 'Equity difference exceeds admin lot limit' });
            }
            admin.equity_lot_limit -= equityDifference;
            await admin.save();
        }

        // Apply updates
        const allowedUpdates = ['user_name', 'equity', 'loss_limit', 'is_flagged', 'can_trade_stocks', 'can_trade_commodities'];
        allowedUpdates.forEach(update => {
            if (updates[update] !== undefined) {
                user[update] = updates[update];
            }
        });
        
        await user.save();
        
        const userResponse = user.toObject();
        delete userResponse.password;
        res.send(userResponse);
    } catch (error) {
        console.error('Update user error:', error);
        res.status(400).send({ error: error.message });
    }
};

exports.getUsers = async (req, res) => {
    try {
        // Find all users created by this admin
        const users = await User.find({ created_by: req.user.id }).select('-password');
        res.status(200).send(users);
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).send({ error: 'Server error fetching users' });
    }
};
