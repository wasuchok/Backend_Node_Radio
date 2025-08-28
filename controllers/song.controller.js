const Song = require('../services/song.service');

async function getSongList(req, res) {
    try {
        const list = await Song.getSongList();
        res.json({ status: 'success', data: list });
    } catch (error) {
        console.error('Error getting song list:', error);
        res.status(500).json({ status: 'error', message: error.message || 'get song list failed' });
    }
}

async function deleteSong(req, res) {
    try {
        const { songId } = req.params;
        console.log("id:", songId);
        if (!songId) {
            return res.status(400).json({ status: 'error', message: 'songId is required' });
        }

        const result = await Song.deleteSong(songId);

        return res.json({ status: 'success', ...result });
    } catch (e) {
        console.error('Error deleteSong:', e);
        return res.status(500).json({ status: 'error', message: e.message || 'delete song failed' });
    }
}

module.exports = { getSongList, deleteSong }