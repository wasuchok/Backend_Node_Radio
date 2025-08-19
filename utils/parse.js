function tryParseJson(buf) {
    const s = buf?.toString?.() ?? '';
    try { return JSON.parse(s); } catch { return s; }
}

const isHttpUrl = (x) => typeof x === 'string' && /^https?:\/\/\S+/i.test(x);

/**
 * รองรับ:
 *  "start <url>", "stop", "pause", "resume", "status"
 *  หรือ JSON { cmd:"start", url:"..." } | { action:"start", url:"..." }
 */
function parseCommandPayload(payloadBuf) {
    const data = tryParseJson(payloadBuf);

    if (typeof data === 'string') {
        const s = data.trim();
        const [cmdRaw, ...rest] = s.split(/\s+/);
        const cmd = (cmdRaw || '').toLowerCase();
        const url = rest.join(' ') || null;
        return { cmd, url };
    }

    if (data && typeof data === 'object') {
        const cmd = (data.cmd || data.action || '').toString().toLowerCase();
        const url = data.url || null;
        return { cmd, url };
    }

    return { cmd: '', url: null };
}

module.exports = { tryParseJson, isHttpUrl, parseCommandPayload };
