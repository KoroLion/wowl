const http = require('http');
const fs = require('fs');

const express = require('express');
const WebSocket = require('ws');

const jwt = require('jsonwebtoken');

class User {
    constructor(id, ws) {
        this.id = id;
        this.ws = ws;

        this.username = null;
        this.profileUrl = null;
        this.avatarUrl = null;
        this.utfIcon = null;

        /*this.groupName = null;
        this.color = null;*/
    }

    send(data) {
        this.ws.send(JSON.stringify(data));
    }

    data() {
        return {
            id: this.id,
            username: this.username,
            profileUrl: this.profileUrl,
            avatarUrl: this.avatarUrl,
            utfIcon: this.utfIcon
        }
    }
}

class Server {
    __forward(curUser, to, data) {
        const user = this.getUser(to);
        if (!user) {
            console.log(`User with id = ${to} was not found!`);
            return;
        }

        data.from = curUser.id;
        user.send(data);
    }

    __auth(curUser, token) {
        let userData = {}
        try {
            userData = jwt.verify(token, this.jwtKey);
        } catch (e) {
            console.log('WARN: User with incorrect token was kicked');
            curUser.ws.close();
            return;
        }

        curUser.username = userData.username;
        curUser.profileUrl = userData.profileUrl;
        curUser.avatarUrl = userData.avatarUrl;
        curUser.utfIcon = (userData.utfIcon)? userData.utfIcon: '';

        this.users.push(curUser);
        curUser.send({
            command: 'selfInfo',
            data: curUser.data()
        });
        this.sendAll({
            command: 'connected',
            data: curUser.data()
        }, curUser.id);

        console.log(`${curUser.username} connected! (${this.wsServer.clients.size} clients now)`);
    }

    __getUsers(curUser) {
        const users = [];
        this.users.map((user) => users.push(user.data()));

        curUser.send({
            to: curUser.id,
            command: 'users',
            data: users
        });
    }

    constructor(httpServer, jwtKey) {
        this.curId = 1;
        this.jwtKey = jwtKey;

        this.wsServer = new WebSocket.Server({ server: httpServer });

        this.users = []

        this.wsServer.on('listening', () => {
            const addr = this.wsServer.address();
            console.log(`WS server is listening at ${addr.address}:${addr.port}`);
        });

        this.wsServer.on('connection', (ws) => {
            const curUser = new User(this.curId++, ws);

            ws.on('message', (message) => {
                const data = JSON.parse(message);
                if (!data.command) {
                    console.log(`incorrect message received: ${message}`);
                    return;
                }

                if (data.command === 'auth') {
                    this.__auth(curUser, data.data);
                    return;
                }
                if (!curUser.username) {
                    return;
                }

                if (data.command === 'getUsers') {
                    this.__getUsers(curUser);
                    return;
                }

                if (data.to) {
                    this.__forward(curUser, data.to, data);
                    return;
                }
            });

            ws.on('close', () => {
                this.sendAll({
                    command: 'disconnected',
                    data: curUser.id
                }, curUser.id);
                console.log(`${curUser.username} disconnected!`);
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

const data = fs.readFileSync('config.json');
const config = JSON.parse(data);

const app = express();
app.use(express.static('public'));

const httpServer = http.createServer(app);
const server = new Server(httpServer, config.jwtKey);

httpServer.listen(8081);
