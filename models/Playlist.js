const mongoose = require('mongoose');

const playlistSchema = new mongoose.Schema(
    {
        order: { type: Number, required: true },
        id_song: { type: mongoose.Schema.Types.ObjectId, ref: 'Song', required: true },
    },
    { timestamps: true }
);

module.exports = mongoose.model('Playlist', playlistSchema);