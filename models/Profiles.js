const mongoose = require('mongoose');

const profilesSchema = new mongoose.Schema({
    accountId: { type: String, unique: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true },
    age: { type: String, required: true },
    gender: { type: String, required: true },
    race: { type: String, required: true },
    education: { type: String, required: true },
    income: { type: String, required: true },
    occupation: { type: String, required: true },
    shirtSize: { type: String, required: true },
    address1: { type: String },
    address2: { type: String },
    city: { type: String, required: true },
    state: { type: String },
    country: { type: String, required: true },
    zipCode: { type: String, required: true },
}, { timestamps: true });

const Profiles = mongoose.model('Profiles', profilesSchema);

module.exports = Profiles;
