const User = require('../models/User');

exports.createAdmin = async(req, res) => {
    try {
        const { user_name, email, password, equityLotLimit, lossLimit } = req.body;
        const admin = new User({
            user_name,
            email,
            password,
            role: 'admin',
            equityLotLimit,
            lossLimit,
            createdBy: req.user._id
        });
        await admin.save();
        res.status(201).send(admin);
    } catch (error) {
        res.status(400).send(error);
    }
};

exports.createUser = async(req, res) => {
    try {
        const { user_name, email, password, equity, lossLimit } = req.body;
        const admin = await User.findById(req.user._id);

        if (admin.equityLotLimit < equity) {
            return res.status(400).send({ error: 'Equity exceeds admin lot limit' });
        }

        if (admin.lossLimit < lossLimit) {
            return res.status(400).send({ error: 'Loss limit exceeds admin limit' });
        }

        const user = new User({
            user_name,
            email,
            password,
            equity,
            lossLimit,
            createdBy: req.user._id
        });

        admin.equityLotLimit -= equity;
        await admin.save();

        await user.save();
        res.status(201).send(user);
    } catch (error) {
        res.status(400).send(error);
    }
};

exports.updateUser = async(req, res) => {
    try {
        const { userId } = req.params;
        const updates = req.body;
        const admin = await User.findById(req.user._id);
        const user = await User.findOne({ _id: userId, createdBy: req.user._id });

        if (!user) {
            return res.status(404).send();
        }

        if (updates.equity) {
            const equityDifference = updates.equity - user.equity;
            if (admin.equityLotLimit < equityDifference) {
                return res.status(400).send({ error: 'Equity exceeds admin lot limit' });
            }
            admin.equityLotLimit -= equityDifference;
            await admin.save();
        }

        Object.keys(updates).forEach(update => user[update] = updates[update]);
        await user.save();
        res.send(user);
    } catch (error) {
        res.status(400).send(error);
    }
};