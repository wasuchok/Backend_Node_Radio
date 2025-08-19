const mongoose = require('mongoose');

const deviceSchema = new mongoose.Schema(
    {
        no: { type: Number, required: true, unique: true, index: true },

        status: {
            stream_enabled: { type: Boolean, default: false },
            volume: { type: Number, default: 0 },
            is_playing: { type: Boolean, default: false },
        },
        lastSeen: { type: Date, index: true },

    },
    { timestamps: true }
);

deviceSchema.index({ no: 1 }, { unique: true });
deviceSchema.index({ lastSeen: -1 });

module.exports = mongoose.model('Device', deviceSchema);
