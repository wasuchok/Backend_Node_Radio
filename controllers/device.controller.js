const {
    seedDevices,
    listDevices,
    clearDevices,
    appendDevices,
} = require('../services/device.service');

async function postSeed(req, res) {
    try {
        const { count, startAt, reset } = req.body || {};
        const result = await seedDevices({
            count: Number(count),
            startAt: startAt ? Number(startAt) : undefined,
            reset: !!reset,
        });
        res.json({ ok: true, ...result });
    } catch (e) {
        res.status(400).json({ ok: false, error: e.message });
    }
}

async function getList(req, res) {
    const items = await listDevices();
    res.json(items);
}

async function deleteAll(req, res) {
    const result = await clearDevices();
    res.json({ ok: true, ...result });
}

async function postAppend(req, res) {
    try {
        const { count } = req.body || {};
        const result = await appendDevices({ count: Number(count) });
        res.json({ ok: true, ...result });
    } catch (e) {
        res.status(400).json({ ok: false, error: e.message });
    }
}

module.exports = { postSeed, getList, deleteAll, postAppend };
