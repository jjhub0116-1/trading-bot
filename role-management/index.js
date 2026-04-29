const express = require('express');
const mongoose = require('mongoose');
const adminRoutes = require('./routes/adminRoutes');

module.exports = (app, mongoUri, jwtSecret) => {
    process.env.JWT_SECRET = jwtSecret;

    mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true })
        .then(() => console.log('Role management module connected to MongoDB'))
        .catch(err => console.log(err));

    app.use(express.json());
    app.use('/admin', adminRoutes);
};