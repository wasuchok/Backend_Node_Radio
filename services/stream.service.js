// services/stream.service.js
const { spawn } = require('child_process');
const cfg = require('../config/config');
const bus = require('./bus');
const path = require('path');
const fs = require('fs');
const ytdlp = require('yt-dlp-exec');
const ffmpeg = require('fluent-ffmpeg');
const Song = require('../models/Song');

let ffmpegProcess = null;
let isPaused = false;
let currentStreamUrl = null;

let stopping = false;
let starting = false;
let activeWs = null;

const isAlive = (p) => !!p && p.exitCode === null;

function wireChildLogging(child, tag) {
    child.stderr.on('data', (d) => {
        const s = d.toString();
        if (s.trim()) console.log(`[${tag}] ${s.trim()}`);
    });
    child.on('error', (err) => console.error(`[${tag}] error:`, err));
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

function stopProcess(proc) {
    if (!proc) return Promise.resolve();
    if (proc.exitCode !== null || proc.signalCode) return Promise.resolve();

    return new Promise((resolve) => {
        const done = () => { proc.removeAllListeners('close'); resolve(); };
        proc.once('close', done);

        try { proc.stdin?.end(); } catch { }
        try { proc.kill('SIGTERM'); } catch { }

        const hardKill = setTimeout(() => {
            if (proc.exitCode === null && !proc.killed) {
                try { proc.kill('SIGKILL'); } catch { }
            }
        }, 1500);

        proc.once('close', () => clearTimeout(hardKill));
    });
}

async function stopAll() {
    if (stopping) return;
    stopping = true;
    try {
        await Promise.all([stopProcess(ffmpegProcess)]);
    } finally {
        ffmpegProcess = null;
        isPaused = false;
        currentStreamUrl = null;
        bus.emit('status', { event: 'stopped' });
        await sleep(250); // ให้ Icecast เคลียร์ mount
        stopping = false;
    }
}

function resolveDirectUrl(youtubeUrl) {
    return new Promise((resolve, reject) => {
        const p = spawn('yt-dlp', [
            '--no-playlist',
            '-f', 'bestaudio',
            '--dump-json',
            youtubeUrl
        ], { stdio: ['ignore', 'pipe', 'pipe'] });

        let out = '';
        p.stdout.on('data', d => out += d.toString());
        p.stderr.on('data', d => console.log('[yt-dlp]', d.toString().trim()));
        p.on('close', (code) => {
            if (code !== 0) return reject(new Error(`yt-dlp exited with ${code}`));
            const lines = out.trim().split('\n').filter(Boolean);
            const obj = JSON.parse(lines[lines.length - 1]);
            const mediaUrl = obj.url;
            const headersObj = obj.http_headers || {};
            let headerLines = Object.entries(headersObj)
                .map(([k, v]) => `${k}: ${v}`)
                .join('\r\n');
            if (headerLines.length) headerLines += '\r\n';
            resolve({ mediaUrl, headerLines });
        });
    });
}

async function start(youtubeUrl) {
    while (starting) await sleep(50);
    starting = true;
    try {
        await stopAll();
        console.log(`▶️ เริ่มสตรีม YouTube: ${youtubeUrl}`);

        const { mediaUrl, headerLines } = await resolveDirectUrl(youtubeUrl);

        const icecastUrl = `icecast://${cfg.icecast.username}:${cfg.icecast.password}` +
            `@${cfg.icecast.host}:${cfg.icecast.port}${cfg.icecast.mount}`;

        const ffArgs = [
            '-hide_banner', '-loglevel', 'warning', '-nostdin',
            '-reconnect', '1', '-reconnect_streamed', '1', '-reconnect_at_eof', '1',
            '-reconnect_on_network_error', '1', '-reconnect_delay_max', '5',
            '-re'
        ];

        if (headerLines && headerLines.length) ffArgs.push('-headers', headerLines);

        ffArgs.push(
            '-i', mediaUrl,
            '-vn',
            '-c:a', 'libmp3lame',
            '-b:a', '128k',
            '-content_type', 'audio/mpeg',
            '-f', 'mp3',
            icecastUrl
        );

        ffmpegProcess = spawn('ffmpeg', ffArgs, { stdio: ['ignore', 'ignore', 'pipe'] });
        wireChildLogging(ffmpegProcess, 'ffmpeg');

        ffmpegProcess.on('close', (code) => {
            console.log(`🎵 สตรีม YouTube จบการทำงาน (รหัส ${code})`);
            const endedUrl = currentStreamUrl;
            ffmpegProcess = null;
            isPaused = false;
            currentStreamUrl = null;
            bus.emit('status', { event: 'ended', reason: 'ffmpeg-closed', code });

            if (cfg.stream.autoReplayOnEnd && endedUrl) {
                setTimeout(() => {
                    console.log('🔁 Auto replay same URL');
                    start(endedUrl).catch(e => console.error('Auto replay failed:', e));
                }, 1500);
            }
        });

        isPaused = false;
        currentStreamUrl = youtubeUrl;
        bus.emit('status', { event: 'started', url: youtubeUrl });
    } finally {
        starting = false;
    }
}

async function startLocalFile(filePath) {
    while (starting) await sleep(50);
    starting = true;
    try {
        await stopAll();
        console.log(`▶️ เริ่มสตรีมไฟล์ในเครื่อง: ${filePath}`);

        const absPath = path.resolve(filePath);

        const icecastUrl = `icecast://${cfg.icecast.username}:${cfg.icecast.password}` +
            `@${cfg.icecast.host}:${cfg.icecast.port}${cfg.icecast.mount}`;

        const ffArgs = [
            '-hide_banner', '-loglevel', 'warning', '-nostdin',
            '-re',
            '-i', absPath,
            '-vn',
            '-c:a', 'libmp3lame',
            '-b:a', '128k',
            '-content_type', 'audio/mpeg',
            '-f', 'mp3',
            icecastUrl
        ];

        ffmpegProcess = spawn('ffmpeg', ffArgs, { stdio: ['ignore', 'ignore', 'pipe'] });
        wireChildLogging(ffmpegProcess, 'ffmpeg');

        ffmpegProcess.on('close', (code) => {
            console.log(`🎵 สตรีมไฟล์ในเครื่องจบการทำงาน (รหัส ${code})`);
            const endedUrl = currentStreamUrl;
            ffmpegProcess = null;
            isPaused = false;
            currentStreamUrl = null;
            bus.emit('status', { event: 'ended', reason: 'ffmpeg-closed', code });

            if (cfg.stream.autoReplayOnEnd && endedUrl) {
                setTimeout(() => {
                    console.log('🔁 Auto replay same file');
                    startLocalFile(endedUrl).catch(e => console.error('Auto replay failed:', e));
                }, 1500);
            }
        });

        isPaused = false;
        currentStreamUrl = absPath;
        bus.emit('status', { event: 'started', url: absPath });
    } finally {
        starting = false;
    }
}

function pause() {
    if (!isAlive(ffmpegProcess)) throw new Error('no active stream');
    if (isPaused) return;
    ffmpegProcess.kill('SIGSTOP');
    isPaused = true;
    bus.emit('status', { event: 'paused' });
}

function resume() {
    if (!ffmpegProcess) throw new Error('no paused stream');
    if (!isPaused) return;
    ffmpegProcess.kill('SIGCONT');
    isPaused = false;
    bus.emit('status', { event: 'resumed' });
}

function getStatus() {
    return {
        isPlaying: isAlive(ffmpegProcess),
        isPaused,
        currentUrl: currentStreamUrl,
    };
}

async function uploadSongYT(youtubeUrl, filename) {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

    const safeName = filename
        ? filename.replace(/[^a-zA-Z0-9ก-๙\-_ ]/g, '')
        : `song-${Date.now()}`;

    const outputName = `${safeName}-${Math.random().toString(36).slice(2)}.mp3`;
    const outputPath = path.join(uploadDir, outputName);
    const tempFile = path.join(uploadDir, `temp-${Date.now()}.m4a`);

    await ytdlp(youtubeUrl, {
        output: tempFile,
        extractAudio: true,
        audioFormat: 'm4a',
        audioQuality: 0,
    });

    await new Promise((resolve, reject) => {
        ffmpeg(tempFile)
            .audioCodec('libmp3lame')
            .audioBitrate(192)
            .save(outputPath)
            .on('end', resolve)
            .on('error', reject);
    });

    fs.unlinkSync(tempFile);

    const song = new Song({ name: safeName, url: outputName });
    await song.save();
    return outputName;
}

async function getSongList() {
    return await Song.find().sort({ no: 1 }).lean();
}

async function startMicStream(ws) {
    // ถ้ามี client เก่าอยู่ ตัดทิ้งก่อน
    if (activeWs && activeWs !== ws) {
        try { activeWs.terminate(); } catch { }
        activeWs = null;
    }

    while (starting) await sleep(50);
    starting = true;

    try {
        await stopAll();
        console.log("🎤 เริ่มสตรีมเสียงจาก Flutter");
        activeWs = ws;

        const icecastUrl = `icecast://${cfg.icecast.username}:${cfg.icecast.password}` +
            `@${cfg.icecast.host}:${cfg.icecast.port}${cfg.icecast.mount}`;

        const ffArgs = [
            '-hide_banner', '-loglevel', 'warning', '-nostdin',
            '-f', 's16le',
            '-ar', '44100',
            '-ac', '2',
            '-i', 'pipe:0',
            // ปรับดังขึ้น +6 dB (ลอง 2.0 → 200%)
            '-af', 'volume=2.0',
            '-c:a', 'libmp3lame',
            '-b:a', '128k',
            '-content_type', 'audio/mpeg',
            '-f', 'mp3',
            icecastUrl
        ];

        ffmpegProcess = spawn('ffmpeg', ffArgs, { stdio: ['pipe', 'ignore', 'pipe'] });
        wireChildLogging(ffmpegProcess, 'ffmpeg');

        ws.on('message', (msg) => {
            if (!ffmpegProcess || ffmpegProcess.exitCode !== null) return;
            if (Buffer.isBuffer(msg)) ffmpegProcess.stdin.write(msg);
        });

        const cleanClose = async () => {
            console.log("❌ Flutter mic disconnected");
            try { ffmpegProcess?.stdin?.end(); } catch { }
            await stopAll();
            if (activeWs === ws) activeWs = null;
        };

        ws.on('close', cleanClose);
        ws.on('error', (err) => {
            console.error('⚠️ WebSocket error:', err.message);
            cleanClose();
        });

        ffmpegProcess.on('close', (code) => {
            console.log(`🎵 ffmpeg for mic closed (code ${code})`);
        });

        isPaused = false;
        currentStreamUrl = "flutter-mic";
        bus.emit('status', { event: 'started', url: currentStreamUrl });
    } finally {
        starting = false;
    }
}

module.exports = {
    start,
    stopAll,
    pause,
    resume,
    getStatus,
    uploadSongYT,
    getSongList,
    startLocalFile,
    startMicStream,
    _internals: { isAlive: (p) => isAlive(p) }
};
