
const WebSocket = require('ws');

let wss;
let clients = [];

function createWSServer(server) {

    wss = new WebSocket.Server({ server });

    wss.on('connection', (ws) => {
        console.log('🔌 WebSocket client connected');
        clients.push(ws);

        ws.on('close', () => {
            console.log('❌ WebSocket client disconnected');
            clients = clients.filter(c => c !== ws);
        });

        ws.on('error', (err) => {
            console.error('⚠️ WebSocket error:', err.message);
        });
    });

    console.log('✅ WebSocket server started');
}

function broadcast(data) {
    if (!wss) return;

    const msg = typeof data === 'string' ? data : JSON.stringify(data);
    clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(msg);
        }
    });
}

module.exports = { createWSServer, broadcast };
