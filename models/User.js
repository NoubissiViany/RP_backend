const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['Super Admin', 'Team', 'Admin', 'Staff', 'User'], required: true },
    company: { type: String },
    team: { type: String },
    permissions: [{ type: String }],
});

const User = mongoose.model('User', userSchema);