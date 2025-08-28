const mqtt = require('mqtt');
const { broadcast } = require('../ws/wsServer');
const Device = require('../models/Device');

let deviceStatus = [];
let seenZones = new Set();
let client = null;
let connected = false;

const pendingRequestsByZone = {};

function connectAndSend({
    brokerUrl = 'mqtt://192.168.1.83:1883',
    username = 'admin',
    password = 'admin',
    commandTopic = 'mass-radio/all/command',
    statusTopic = 'mass-radio/+/status',
    payload = { set_stream: true }
} = {}) {
    deviceStatus = [];
    seenZones.clear();

    client = mqtt.connect(brokerUrl, {
        username,
        password,
        protocolVersion: 5,
        reconnectPeriod: 5000,
        clean: true
    });

    client.on('connect', () => {
        connected = true;
        console.log('✅ MQTT connected');

        client.subscribe(statusTopic, { qos: 1 }, (err) => {
            if (err) console.error('❌ Subscribe error:', err.message);
            else console.log(`📥 Subscribed to ${statusTopic}`);
        });


        setTimeout(() => {
            publish(commandTopic, payload);
        }, 1000);

        setInterval(() => {
            publish(commandTopic, { get_status: true });
        }, 30000);

        setInterval(checkOfflineZones, 10000);
    });

    client.on('close', () => {
        connected = false;
        console.warn('⚠️ MQTT connection closed');
    });

    client.on('message', (topic, message, packet) => {
        const match = topic.match(/mass-radio\/([^/]+)\/status/);
        const zoneStr = match ? match[1] : null;
        if (!zoneStr) return;

        const matchNum = zoneStr.match(/\d+/);
        const no = matchNum ? parseInt(matchNum[0], 10) : null;
        if (!no) {
            console.warn(`⚠️ Invalid zone number: ${zoneStr}`);
            return;
        }

        if (packet.retain) {
            if (!seenZones.has(zoneStr)) {
                seenZones.add(zoneStr);
                client.publish(topic, '', { qos: 1, retain: true }, () => {
                    console.log(`🧹 Cleared retained for ${zoneStr}`);
                });
            }
            return;
        }

        if (!message || !message.toString().trim()) return;

        try {
            const data = JSON.parse(message.toString());


            if (pendingRequestsByZone[no]) {
                pendingRequestsByZone[no].resolve({ zone: no, ...data });
                delete pendingRequestsByZone[no];
            }

            upsertDeviceStatus(no, data);
            console.log(`✅ Response from zone ${no}:`, data);

            broadcast({ zone: no, ...data });
            updateDeviceInDB(no, data);
        } catch (err) {
            console.error(`❌ Failed to parse message from zone ${no}`, err.message);
        }
    });

    client.on('error', (err) => console.error('❌ MQTT error:', err.message));
    client.on('reconnect', () => console.log('🔁 MQTT reconnecting...'));
    client.on('offline', () => console.warn('⚠️ MQTT offline'));
}

function getStatus() {
    return deviceStatus;
}


function publishAndWaitByZone(topic, payload, timeoutMs = 5000) {
    return new Promise((resolve, reject) => {
        if (!client || !connected) {
            return reject(new Error('MQTT not connected'));
        }


        const match = topic.match(/zone(\d+)/);
        if (!match) {
            return reject(new Error(`Cannot extract zone from topic: ${topic}`));
        }
        const zone = parseInt(match[1], 10);


        pendingRequestsByZone[zone] = { resolve, reject };


        setTimeout(() => {
            if (pendingRequestsByZone[zone]) {
                delete pendingRequestsByZone[zone];
                reject(new Error(`Timeout waiting for response from zone ${zone}`));
            }
        }, timeoutMs);


        const message = JSON.stringify(payload);
        client.publish(topic, message, { qos: 1 }, (err) => {
            if (err) reject(err);
        });
    });
}


function publish(topic, payload, opts = { qos: 1, retain: false }) {
    if (!client || !connected) {
        console.error('❌ Cannot publish, MQTT not connected');
        return;
    }
    const message = typeof payload === 'object' ? JSON.stringify(payload) : String(payload);
    client.publish(topic, message, opts, (err) => {
        if (err) console.error(`❌ Failed to publish ${topic}:`, err.message);
        else console.log(`📤 Published to ${topic}:`, message);
    });
}

function upsertDeviceStatus(no, data) {
    const now = Date.now();
    const index = deviceStatus.findIndex(d => d.zone === no);

    if (index >= 0) {
        deviceStatus[index] = { zone: no, data, lastSeen: now };
    } else {
        deviceStatus.push({ zone: no, data, lastSeen: now });
    }
}

async function updateDeviceInDB(no, data) {
    try {
        await Device.findOneAndUpdate(
            { no },
            {
                $set: {
                    status: {
                        is_playing: !!data.is_playing,
                        stream_enabled: !!data.stream_enabled,
                        volume: data.volume ?? 0,
                    },
                    lastSeen: new Date()
                }
            },
            { upsert: true, new: true }
        );
    } catch (err) {
        console.error(`❌ Failed to update device ${no} in DB:`, err.message);
    }
}

async function checkOfflineZones() {
    const now = Date.now();
    const beforeCount = deviceStatus.length;

    const onlineZones = [];
    const offlineZones = [];

    
    if (deviceStatus.length === 0) {
        try {
           
            await Device.updateMany(
                {},
                {
                    $set: {
                        'status.stream_enabled': false,
                        'status.volume': 0,
                        'status.is_playing': false,
                        lastSeen: new Date()
                    }
                }
            );

           
            const allDevices = await Device.find({});
            allDevices.forEach(d => {
                broadcast({
                    zone: d.no,
                    stream_enabled: false,
                    volume: 0,
                    is_playing: false,
                    offline: true
                });
            });

            console.log("⚠️ deviceStatus ว่าง → ตั้งค่าทุกโซนเป็น offline");
        } catch (err) {
            console.error("❌ Failed to mark all devices offline:", err.message);
        }
        return; 
    }

 
    deviceStatus = deviceStatus.filter(d => {
        const online = now - d.lastSeen <= 35000;
        if (online) {
            onlineZones.push(d.zone);
        } else {
            offlineZones.push(d.zone);
        }
        return online;
    });

    try {
        if (offlineZones.length > 0) {
            await Device.updateMany(
                { no: { $in: offlineZones } },
                {
                    $set: {
                        'status.stream_enabled': false,
                        'status.volume': 0,
                        'status.is_playing': false,
                        lastSeen: new Date()
                    }
                }
            );
            offlineZones.forEach(zoneNo => {
                broadcast({
                    zone: zoneNo,
                    stream_enabled: false,
                    volume: 0,
                    is_playing: false,
                    offline: true
                });
            });
        }
    } catch (err) {
        console.error('❌ Failed to update offline zones in DB:', err.message);
    }

    if (deviceStatus.length !== beforeCount) {
        console.log(`⚠️ Removed offline zones. Active zones: ${deviceStatus.length}`);
    }
}

module.exports = { connectAndSend, getStatus, publish, publishAndWaitByZone };
