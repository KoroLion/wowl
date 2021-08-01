const http = require('http');
const WebSocket = require('ws');

class User {
    constructor(id, username, ws) {
        this.id = id;
        this.username = username;
        this.ws = ws;
    }

    send(data) {
        this.ws.send(data);
    }

    data() {
        return {
            id: this.id,
            username: this.username
        }
    }
}

class Server {
    constructor(port) {
        this.curId = 1;

        this.port = port;

        this.httpServer = http.createServer();
        this.wsServer = new WebSocket.Server({ server: this.httpServer });

        this.users = []

        this.wsServer.on('listening', () => {
            const addr = this.wsServer.address();
            console.log(`WS server is listening at ${addr.address}:${addr.port}`);
        });

        this.wsServer.on('connection', (ws) => {
            const curUser = new User(this.curId++, null, ws);

            ws.on('message', (message) => {
                const data = JSON.parse(message);
                if (!data.command || !data.data) {
                    console.log(`incorrect message received: ${message}`);
                    return;
                }

                if (data.command === 'username') {
                    curUser.username = data.data;
                    this.users.push(curUser)
                    this.sendAll(JSON.stringify({
                        command: 'connected',
                        data: curUser.data()
                    }), curUser.id);

                    console.log(`${curUser.username} connected! (${this.wsServer.clients.size} clients now)`);

                    const users = [];
                    this.users.map((user) => users.push(user.data()));

                    curUser.send(JSON.stringify({
                        to: curUser.id,
                        command: 'users',
                        data: users
                    }));
                } else if (data.to) {
                    const user = this.getUser(data.to);
                    if (!user) {
                        console.log(`User with id = ${data.to} was not found!`);
                        return;
                    }
                    user.send(message);
                } else {
                    console.log(`${user.username} retranslating ${data}`);
                    this.sendAll(message, user.id);
                }
            });

            ws.on('close', () => {
                this.sendAll(JSON.stringify({
                    command: 'disconnected',
                    data: curUser.id
                }), curUser.id);
                console.log(`${curUser.username} diconnected!`);
                for (let i = 0; i < this.users.length; i++) {
                    if (this.users[i].id === curUser.id) {
                        this.users.splice(i, 1);
                        return;
                    }
                }
            });
        });
    }

    listen() {
        this.httpServer.listen(this.port);
    }

    sendAll(data, except = 0) {
        for (const user of this.users) {
            if (user.id !== except) {
                user.send(data);
            }
        }
    }

    getUser(id) {
        for (const user of this.users) {
            if (user.id === id) {
                return user;
            }
        }
        return null;
    }
}

const server = new Server(8081);
server.listen();
