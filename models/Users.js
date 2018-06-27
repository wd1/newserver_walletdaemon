const bcrypt = require('bcrypt-nodejs');
const mongoose = require('mongoose');

const usersSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    password: String,
    passwordResetToken: String,
    passwordResetExpires: Date,
    role: { type: String, default: 'user' },
    verified: { type: Boolean, default: false },
    verificationToken: { type: String, unique: true },

    facebook: String,
    google: String,
    github: String,
    linkedin: String,
    tokens: Array
}, { timestamps: true });

/**
 * Password hash middleware.
 */
usersSchema.pre('save', function save(next) {
    const user = this;

    if (!user.isModified('password')) {
        return next();
    }

    bcrypt.genSalt(10, (err, salt) => {
        if (err) return next(err);

        bcrypt.hash(user.password, salt, null, (err, hash) => {
            if (err) return next(err);

            user.password = hash;
            next();
        });
    });
});

/**
 * Helper method for validating user's password.
 */
usersSchema.methods.comparePassword = function comparePassword(candidatePassword, cb) {
    bcrypt.compare(candidatePassword, this.password, (err, isMatch) => {
        cb(err, isMatch);
    });
};

const Users = mongoose.model('Users', usersSchema);

module.exports = Users;
