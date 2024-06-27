import http = require('http');
import express = require('express');
import ws = require('ws');
import jwt = require('jsonwebtoken');

import { Config } from "../schemas/config_schema"
import User from "../models/user";


export default class Server {
    curId: number
    config: Config
    httpServer: http.Server
    wsServer: ws.Server
    users: User[]

    __DEBUG_STATIC_FOLDER = "./src/frontend";
    __DEBUG_USERNAMES = [
        'Kiba', 'Toboe', 'Hige', 'Tsume', 'Blue',
        'Leo', 'Kova', 'Jake', 'Kobb',
        'Wolf', 'Fang', 'Thane', 'River'
    ]

    constructor(config: Config) {
        this.curId = 1
        this.config = config

        this.httpServer = this.__createHttpServer(config.debug)
        this.wsServer = new ws.Server({server: this.httpServer})

        this.users = []
    }

    __createHttpServer(debug: boolean): http.Server {
        const app = express();

        if (debug) {
            console.log(`DEBUG: Serving static files from '${this.__DEBUG_STATIC_FOLDER}'`);
            app.use(express.static(this.__DEBUG_STATIC_FOLDER));
        }

        return http.createServer(app);
    }

    __forward(curUser: User, to: number, data): void {
        const user = this.__getUser(to);
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
                username: this.__getRandomDebugUsername(),
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
        this.__sendAll({
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
            if (typeof (addr) === "string") {
                console.log(`WS server is listening at ${addr}`);
            } else {
                console.log(`WS server is listening at ${addr.address}:${addr.port}`);
            }
        });
        this.wsServer.on('connection', (socket: ws.WebSocket) => {
            this.__connectionHandler(socket)
        });

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
            this.__sendAll({
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

    __sendAll(data: { command: string, data: any }, except: number = 0): void {
        for (const user of this.users) {
            if (user.id !== except) {
                user.send(data);
            }
        }
    }

    __getUser(id: number): User | null {
        for (const user of this.users) {
            if (user.id === id) {
                return user;
            }
        }
        return null;
    }

    __getRandomDebugUsername(): string {
        return this.__DEBUG_USERNAMES[Math.round(Math.random() * (this.__DEBUG_USERNAMES.length - 1))];
    }
}
