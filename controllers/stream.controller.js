const stream = require('../services/stream.service');
const multer = require('multer')
const { isHttpUrl } = require('../utils/parse');
const Song = require("../models/Song")
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '../uploads');
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const safeName = req.body.filename
            ? req.body.filename.replace(/[^a-zA-Z0-9ก-๙\-_ ]/g, '')
            : `song-${Date.now()}`;
        const uniqueSuffix = Math.random().toString(36).slice(2);
        cb(null, `${safeName}-${uniqueSuffix}.mp3`);
    }
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'audio/mpeg') {
        cb(null, true);
    } else {
        cb(new Error('Only MP3 files are allowed!'), false);
    }
};

const upload = multer({ storage, fileFilter });


async function uploadSongFile(req, res) {
    try {
        const { filename } = req.body;
        const file = req.file;

        if (!file) {
            return res.status(400).json({ status: 'error', message: 'No file uploaded' });
        }

        const savedFileName = path.basename(file.filename, '.mp3');

        const song = new Song({
            name: filename || file.originalname.replace(/\.mp3$/i, ''),
            url: file.filename
        });

        await song.save();

        res.json({
            status: 'success',
            message: 'Song uploaded successfully',
            file: `${file.filename}`
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ status: 'error', message: err.message });
    }
}

async function start(req, res) {
    const url = req.query.url || req.body?.url;
    if (!url || !isHttpUrl(url)) {
        return res.status(400).json({ status: 'error', message: 'ต้องระบุ URL ที่ถูกต้อง' });
    }
    try {
        await stream.start(url);
        res.json({ status: 'success', url });
    } catch (e) {
        console.error('Error starting stream:', e);
        res.status(500).json({ status: 'error', message: e.message || 'start failed' });
    }
}

async function startFile(req, res) {
    const filePath = req.query.path || req.body?.path;
    try {
        await stream.startLocalFile(filePath);
        res.json({ status: 'success', filePath });
    } catch (e) {
        console.error('Error starting stream:', e);
        res.status(500).json({ status: 'error', message: e.message || 'start failed' });
    }
}

async function stop(_req, res) {
    try {
        await stream.stopAll();
        res.json({ status: 'success' });
    } catch (e) {
        res.status(500).json({ status: 'error', message: e.message });
    }
}

function status(_req, res) {
    res.json({ status: 'success', data: stream.getStatus() });
}

function pause(_req, res) {
    try {
        stream.pause();
        res.json({ status: 'success' });
    } catch (e) {
        res.status(400).json({ status: 'error', message: e.message });
    }
}

function resume(_req, res) {
    try {
        stream.resume();
        res.json({ status: 'success' });
    } catch (e) {
        res.status(400).json({ status: 'error', message: e.message });
    }
}

async function uploadSongYT(req, res) {
    try {
        const { url, filename } = req.body || {};
        if (!url || !isHttpUrl(url)) {
            return res.status(400).json({ status: 'error', message: 'ต้องระบุ URL ที่ถูกต้อง' });
        }
        const name = await stream.uploadSongYT(url, filename);
        res.json({ status: 'success', name });
    } catch (e) {
        console.error('Error uploading song:', e);
        res.status(500).json({ status: 'error', message: e.message || 'upload failed' });
    }
}

module.exports = { start, stop, status, pause, resume, uploadSongYT, upload, uploadSongFile, startFile };
