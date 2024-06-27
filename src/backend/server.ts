import http = require('http');
import fs = require("fs")
import perfHooks = require('perf_hooks');

import express = require('express');
import ws = require('ws');
import jwt = require('jsonwebtoken');

const DEBUG_USERNAMES = [
    'Kiba', 'Toboe', 'Hige', 'Tsume', 'Blue',
    'Leo', 'Kova', 'Jake', 'Kobb',
    'Wolf', 'Fang', 'Thane', 'River'
];

function getRandomArrEl(arr) {
    return arr[Math.round(Math.random() * (arr.length - 1))];
}

class User {
    id: number
    ws: ws.WebSocket
    connectedTime: DOMHighResTimeStamp

    username: string
    profileUrl: string
    avatarUrl: string
    utfIcon: string

    constructor(id: number, ws: ws.WebSocket) {
        this.id = id;
        this.ws = ws;
        this.connectedTime = perfHooks.performance.now();

        this.username = null;
        this.profileUrl = null;
        this.avatarUrl = null;
        this.utfIcon = null;
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
        };
    }
}

class Server {
    curId: number
    config: any
    httpServer: http.Server;
    wsServer: ws.Server;
    users: User[];

    debugStaticFolder: string = "./src/frontend";

    constructor(config) {
        this.curId = 1;
        this.config = config;

        this.httpServer = this.__createHttpServer(config.debug);
        this.wsServer = new ws.Server({server: this.httpServer});

        this.users = [];
    }

    __createHttpServer(debug: boolean): http.Server {
        const app = express();

        if (debug) {
            console.log(`DEBUG: Serving static files from '${this.debugStaticFolder}'`);
            app.use(express.static(this.debugStaticFolder));
        }

        return http.createServer(app);
    }

    __forward(curUser: User, to: number, data): void {
        const user = this.getUser(to);
        if (user === null) {
            console.log(`User with id = ${to} was not found!`);
            return;
        }

        data.from = curUser.id;
        user.send(data);
    }

    __auth(curUser: User, token: string): void {
        let userData;
        if (this.config.debug) {
            userData = {
                username: getRandomArrEl(DEBUG_USERNAMES),
                profileUrl: 'http://localhost',
                avatarUrl: 'https://ddragon.leagueoflegends.com/cdn/12.1.1/img/profileicon/4414.png'
            };
        } else {
            try {
                userData = jwt.verify(token, this.config.jwtKey);
            } catch (e) {
                console.log('WARN: User with incorrect token was kicked');
                curUser.ws.close();
                return;
            }
        }

        curUser.username = userData.username;
        curUser.profileUrl = userData.profileUrl;
        curUser.avatarUrl = userData.avatarUrl;
        curUser.utfIcon = (userData.utfIcon) ? userData.utfIcon : '';

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

    __getUsers(curUser: User): void {
        const users = [];
        this.users.map((user) => users.push(user.data()));

        curUser.send({
            to: curUser.id,
            command: 'users',
            data: users
        });
    }

    listen(): void {
        this.wsServer.on('listening', () => {
            const addr = this.wsServer.address();
            if (typeof(addr) === "string") {
                console.log(`WS server is listening at ${addr}`);
            } else {
                console.log(`WS server is listening at ${addr.address}:${addr.port}`);
            }
        });
        this.wsServer.on('connection', (socket: ws.WebSocket) => { this.__connectionHandler(socket) });

        this.httpServer.listen(this.config.port);
    }

    __connectionHandler(socket: ws.WebSocket): void {
        const curUser: User = new User(this.curId++, socket);
        curUser.send({
            command: 'serverInfo',
            data: {
                debug: this.config.debug,
                authUrl: this.config.authUrl,
                iceServers: this.config.iceServers,
            }
        });

        socket.on('message', (message: string) => {
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

        socket.on('close', () => {
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
    }

    sendAll(data: {command: string, data: any}, except: number = 0): void {
        for (const user of this.users) {
            if (user.id !== except) {
                user.send(data);
            }
        }
    }

    getUser(id: number): User | null {
        for (const user of this.users) {
            if (user.id === id) {
                return user;
            }
        }
        return null;
    }
}

const data = fs.readFileSync('config.json').toString();
const config = JSON.parse(data);

const server = new Server(config);
server.listen();
