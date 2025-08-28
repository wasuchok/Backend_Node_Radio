const Song = require('../models/Song');
const path = require('path');
const fs = require('fs');

async function getSongList() {
    return await Song.find().sort({ no: 1 }).lean();
}

async function deleteSong(id) {
    try {
        const song = await Song.findById(id);
        if (!song) {
            console.log(`Song with id ${id} not found`);
            return;
        }

        const filePath = path.join(process.cwd(), 'uploads', song.url);

        await Song.findByIdAndDelete(id);
        console.log(`Song with id ${id} deleted from DB`);

        fs.unlink(filePath, (err) => {
            if (err) {
                console.error(`Error deleting file ${filePath}:`, err);
            } else {
                console.log(`File ${filePath} deleted successfully`);
            }
        });

    } catch (error) {
        console.error(`Error deleting song with id ${id}:`, error);
    }
}

module.exports = { getSongList, deleteSong };