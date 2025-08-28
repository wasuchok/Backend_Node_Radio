const mqttSvc = require('../services/mqtt.service');

function publish(req, res) {
    const { topic, payload, qos = 1, retain = false } = req.body || {};
    if (!topic) return res.status(400).json({ error: 'Topic is required' });
    if (typeof payload === 'undefined') return res.status(400).json({ error: 'Payload is required' });

    try {
        mqttSvc.publish(topic, payload, { qos, retain });
        res.json({ ok: true, topic, payload, qos, retain });
    } catch (e) {
        res.status(500).json({ error: 'Publish failed', details: e.message });
    }
}

async function publishGetStatusAndWait(req, res) {
    const { zone } = req.body;
    if (!zone) return res.status(400).json({ error: 'Missing zone' });

    try {
        const result = await mqttSvc.publishAndWaitByZone(`mass-radio/zone${zone}/command`, {
            get_status: true
        });
        res.json(result)
    } catch (err) {
        res.status(500).json({ error: 'Publish failed', details: err.message });
    }
}

async function getStatus(req, res) {
    try {
        res.json(mqttSvc.getStatus());
    } catch (err) {
        res.status(500).json({ error: 'Get status failed', details: err.message });
    }
}

module.exports = { publish, publishGetStatusAndWait, getStatus };
