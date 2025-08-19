const mongoose = require('mongoose');

const songSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        url: { type: String, required: true },
    },
    { timestamps: true }
);

module.exports = mongoose.model('Song', songSchema);