const { setupPlaylist, getPlaylist, getSongList } = require('../services/playlist.service');
const stream = require('../services/stream.service')

async function playPlaylist(req, res) {
    try {
        const loop = req.query.loop === 'true' || req.body?.loop === true;
        const result = await stream.playPlaylist({ loop });
        return res.json({ status: 'success', ...result });
    } catch (e) {
        console.error('Error playPlaylist:', e);
        return res.status(500).json({ status: 'error', message: e.message || 'play playlist failed' });
    }
}

async function nextTrack(_req, res) {
    try {
        const result = await stream.nextTrack();
        if (!result.success) {
            return res.status(400).json({ status: 'error', message: result.message });
        }
        return res.json({ status: 'success', ...result });
    } catch (e) {
        console.error('Error nextTrack:', e);
        return res.status(500).json({ status: 'error', message: e.message || 'next failed' });
    }
}

async function prevTrack(_req, res) {
    try {
        const result = await stream.prevTrack();
        if (!result.success) {
            return res.status(400).json({ status: 'error', message: result.message });
        }
        return res.json({ status: 'success', ...result });
    } catch (e) {
        console.error('Error prevTrack:', e);
        return res.status(500).json({ status: 'error', message: e.message || 'prev failed' });
    }
}

async function stopPlaylist(_req, res) {
    try {
        const result = await stream.stopPlaylist();
        return res.json({ status: 'success', ...result });
    } catch (e) {
        console.error('Error stopPlaylist:', e);
        return res.status(500).json({ status: 'error', message: e.message || 'stop playlist failed' });
    }
}

async function postSetupPlaylist(req, res) {
    try {
        const { playlist } = req.body;
        const result = await setupPlaylist(playlist);
        res.json({ ok: true, result });
    } catch (e) {
        res.status(400).json({ ok: false, error: e.message });
    }
}

async function getPlaylistSong(req, res) {
    try {
        const list = await getPlaylist();
        res.json({ ok: true, list });
    } catch (e) {
        res.status(400).json({ ok: false, error: e.message });
    }
}

module.exports = {
    postSetupPlaylist, getPlaylistSong, playPlaylist,
    nextTrack,
    prevTrack,
    stopPlaylist,
};
