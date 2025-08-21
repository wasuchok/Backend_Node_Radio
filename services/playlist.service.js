const Playlist = require('../models/Playlist');
const Song = require('../models/Song')

async function setupPlaylist(playlist) {
    try {

        if (!Array.isArray(playlist)) {
            throw new Error('Body ต้องเป็น array ของรายการเพลง');
        }


        const docs = playlist.map((item, idx) => {

            const id_song = item.id_song ?? item._id ?? item.id ?? null;
            const order = Number(item.order ?? idx + 1);

            if (!id_song) {
                throw new Error(`รายการที่ ${idx} ไม่มี id_song/_id/id`);
            }
            if (!Number.isFinite(order)) {
                throw new Error(`รายการที่ ${idx} มี order ไม่ถูกต้อง`);
            }

            return { order, id_song: String(id_song) };
        });


        const del = await Playlist.deleteMany({});


        const inserted = await Playlist.insertMany(docs, { ordered: true });

        return {
            success: true,
            message: `Setup playlist สำเร็จ (ลบ ${del.deletedCount} แถว, เพิ่ม ${inserted.length} แถว)`,
        };
    } catch (err) {
        console.error('Error in setupPlaylist:', err);
        throw err;
    }
}

async function getPlaylist() {
    const list = await Playlist.find().sort({ order: 1 }).populate('id_song');
    return list;
}

async function getSongList() {
    const list = await Song.find()
    return list;
}

module.exports = { setupPlaylist, getPlaylist, getSongList };