const { setupPlaylist, getPlaylist, getSongList } = require('../services/playlist.service');

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

async function getSongListSong(req, res) {
    try {
        const list = await getSongList();
        res.json({ ok: true, list });
    } catch (e) {
        res.status(400).json({ ok: false, error: e.message })
    }
}

module.exports = { postSetupPlaylist, getPlaylistSong, getSongListSong };
