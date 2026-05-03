const bcrypt = require('bcryptjs');
const User = require('../models/User');
const WalletTransaction = require('../models/WalletTransaction');
const { calculatePortfolio, calculateWallet } = require('../modules/tradeCalculations');

async function generateUserId() {
    // Generate a simple unique user_id based on count
    const count = await User.countDocuments();
    return count + 101; // Start at 101 to avoid test user collisions
}

exports.createAdmin = async (req, res) => {
    try {
        const { user_name, email, password, lot_limit, loss_limit } = req.body;
        
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
            commodity_equity: lot_limit || 0,
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
        const { user_name, email, password, lot_limit, loss_limit, can_trade_stocks, can_trade_commodities } = req.body;
        
        // Find admin using their custom user_id (not ObjectId)
        const admin = await User.findOne({ user_id: req.user.id });
        if (!admin) return res.status(404).send({ error: 'Admin not found' });

        if (admin.commodity_equity < lot_limit) {
            return res.status(400).send({ error: 'Lot limit exceeds admin lot limit pool' });
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
            commodity_equity: lot_limit !== undefined ? lot_limit : 20,
            loss_limit: loss_limit || 500,
            can_trade_stocks: can_trade_stocks !== undefined ? can_trade_stocks : true,
            can_trade_commodities: can_trade_commodities !== undefined ? can_trade_commodities : true,
            created_by: req.user.id
        });

        // Deduct from admin limits
        admin.commodity_equity -= (lot_limit !== undefined ? lot_limit : 20);
        admin.loss_limit -= loss_limit; 
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
        
        // Admin or Superadmin executing the update
        const admin = await User.findOne({ user_id: req.user.id });
        
        let user;
        if (req.user.role === 'superadmin') {
            // Superadmin can update any user or admin
            user = await User.findOne({ user_id: userId, role: { $in: ['user', 'admin'] } });
        } else {
            // Admin can only update users they created
            user = await User.findOne({ user_id: userId, created_by: req.user.id });
        }

        if (!admin || !user) {
            return res.status(404).send({ error: 'User not found or you do not have permission' });
        }

        if (updates.lot_limit !== undefined) {
            const lotDifference = updates.lot_limit - user.commodity_equity;
            if (admin.commodity_equity < lotDifference) {
                return res.status(400).send({ error: 'Lot limit difference exceeds admin lot limit pool' });
            }
            admin.commodity_equity -= lotDifference;
            user.commodity_equity = updates.lot_limit;
        }

        if (updates.loss_limit !== undefined) {
            const lossDifference = updates.loss_limit - user.loss_limit;
            if (admin.loss_limit < lossDifference) {
                return res.status(400).send({ error: 'Loss limit difference exceeds admin limit' });
            }
            admin.loss_limit -= lossDifference;
        }
        
        await admin.save();

        // Apply updates (equity is intentionally excluded here as it's default)
        const allowedUpdates = ['user_name', 'loss_limit', 'is_flagged', 'can_trade_stocks', 'can_trade_commodities'];
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
        let users;
        if (req.user.role === 'superadmin') {
            // Superadmin can see all users and admins
            users = await User.find({ role: { $in: ['user', 'admin'] } }).select('-password');
        } else {
            // Admin can only see users they created
            users = await User.find({ created_by: req.user.id }).select('-password');
        }
        res.status(200).send(users);
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).send({ error: 'Server error fetching users' });
    }
};

exports.getUser = async (req, res) => {
    try {
        const { userId } = req.params;
        let user;
        
        if (req.user.role === 'superadmin') {
            // Superadmin can see any user or admin
            user = await User.findOne({ user_id: userId, role: { $in: ['user', 'admin'] } }).select('-password');
        } else {
            // Admin can only see users they created
            user = await User.findOne({ user_id: userId, created_by: req.user.id }).select('-password');
        }

        if (!user) {
            return res.status(404).send({ error: 'User not found or you do not have permission' });
        }

        res.status(200).send(user);
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).send({ error: 'Server error fetching user details' });
    }
};

exports.getUserPortfolio = async (req, res) => {
    try {
        const { userId } = req.params;
        let user;
        if (req.user.role === 'superadmin') {
            user = await User.findOne({ user_id: userId });
        } else {
            user = await User.findOne({ user_id: userId, created_by: req.user.id });
        }

        if (!user) return res.status(404).send({ error: 'User not found or unauthorized' });

        const portfolio = await calculatePortfolio(user.user_id);
        res.status(200).json(portfolio);
    } catch (error) {
        res.status(500).send({ error: error.message });
    }
};

exports.getUserWallet = async (req, res) => {
    try {
        const { userId } = req.params;
        let user;
        if (req.user.role === 'superadmin') {
            user = await User.findOne({ user_id: userId });
        } else {
            user = await User.findOne({ user_id: userId, created_by: req.user.id });
        }

        if (!user) return res.status(404).send({ error: 'User not found or unauthorized' });

        const wallet = await calculateWallet(user);
        res.status(200).json(wallet);
    } catch (error) {
        res.status(500).send({ error: error.message });
    }
};

exports.getUserTransactions = async (req, res) => {
    try {
        const { userId } = req.params;
        let user;
        if (req.user.role === 'superadmin') {
            user = await User.findOne({ user_id: userId });
        } else {
            user = await User.findOne({ user_id: userId, created_by: req.user.id });
        }

        if (!user) return res.status(404).send({ error: 'User not found or unauthorized' });

        const txns = await WalletTransaction.find({ user_id: user.user_id }).sort({ timestamp: -1 });
        res.status(200).json(txns);
    } catch (error) {
        res.status(500).send({ error: error.message });
    }
};
