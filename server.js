const WebSocket = require('ws');
const fs = require('node:fs');
const crypto = require('crypto')

// Создаем WebSocket-сервер на порту 8080
const wss = new WebSocket.Server({ port: process.env.SERVER_PORT || 8080, host: process.env.SERVER_HOST || '127.0.0.1' });

let clients = []

wss.on('connection', (ws, req) => {
    console.log('New client connected');

    const token = req.headers['sec-websocket-protocol'];
    ws.token = token;

    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    if (!clients[token]) {
        clients[token] = [];
    }
    clients[token].push(ws);

    fs.readFile(token === 'default' ? 'state.txt' : `privateStates/${token}.txt`, 'utf8', (err, data) => {
        ws.send(JSON.stringify({ type: 'loadState', data: err ? '' : data, online: clients[token].length, privateRoom: crypto.createHash('md5').update(ip + new Date().toString()).digest("hex") }));
    });

    clients[token].forEach(client => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'setOnline', online: clients[token].length }));
        }
    });

    ws.on('message', (message) => {
        const m = JSON.parse(message);

        if (m.type === 'saveState') {
            fs.writeFile(token === 'default' ? 'state.txt' : `privateStates/${token}.txt`, m.data, err => {
                if (err) {
                    console.error(err);
                }
            });
        } else if (m.type === 'loadState') {
            fs.readFile(token === 'default' ? 'state.txt' : `privateStates/${token}.txt`, 'utf8', (err, data) => {
                if (err) {
                    console.error(err);
                } else {
                    ws.send(JSON.stringify({ type: 'loadState', data: data, online: clients[token].length }));
                }
            });
        } else {
            // Отправляем сообщение всем подключенным клиентам, кроме отправителя
            clients[token].forEach(client => {
                if (client !== ws && client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify(m));
                }
            });
        }
    });

    ws.on('close', () => {
        const online = clients[token].length - 1;
        clients[token].forEach((client, index) => {
            if (client === ws) {
                clients[token].splice(index, 1);
                if (clients[token].length === 0) {
                    delete clients[token];
                }
            }
            if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({ type: 'setOnline', online: online }));
            }
        });

        console.log('Client disconnected');
    });
});

console.log('WebSocket сервер запущен на порту 8080');