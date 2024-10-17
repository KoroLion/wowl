import * as http from 'http';
import * as express from 'express';
import * as ws from 'ws';
import * as jwt from 'jsonwebtoken';
import * as crypto from "crypto"

import { Config } from "../schemas/config_schema"
import User from "../models/user";
import Room from "../models/room"


export default class Server {
    curId: number
    config: Config
    httpServer: http.Server
    wsServer: ws.Server
    users: User[]
    rooms: Map<crypto.UUID, Room>

    pingInterval: NodeJS.Timeout

    __PING_INTERVAL_MS: number = 10000
    __MAXIMUM_ROOMS_PER_USER: number = 2

    __DEBUG_USERNAMES: string[] = [
        'Kiba', 'Toboe', 'Hige', 'Tsume', 'Blue',
        'Leo', 'Kova', 'Jake', 'Kobb',
        'Wolf', 'Fang', 'Thane', 'River'
    ]

    constructor(config: Config) {
        this.curId = 1
        this.config = config

        this.httpServer = this.__createHttpServer(config.debug)
        this.wsServer = new ws.Server({server: this.httpServer})

        this.users = [];
        this.rooms = new Map();
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

        this.pingInterval = setInterval(() => {
            this.users.map((user) => {
                if (performance.now() - user.successfulPingTime > this.__PING_INTERVAL_MS * 3) {
                    user.ws.close();
                } else {
                    user.waitingForPong = true
                    user.send({"command": "ping"})
                }
            })
        }, this.__PING_INTERVAL_MS);

        this.httpServer.listen(this.config.port);
    }

    __createHttpServer(debug: boolean): http.Server {
        const app = express();
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
        // if (this.config.debug) {
        //     userData = {
        //         uid: null,
        //         username: this.__getRandomDebugUsername(),
        //         profileUrl: 'http://localhost',
        //         avatarUrl: 'https://ddragon.leagueoflegends.com/cdn/12.1.1/img/profileicon/4414.png'
        //     };
        // } else {
        try {
            userData = jwt.verify(token, this.config.jwtKey);
        } catch {
            console.log('WARN: User with incorrect token was kicked');
            curUser.ws.close();
            return;
        }
        // }

        const utfIcon = (userData.utfIcon) ? userData.utfIcon : '';
        curUser.authenticate(userData.uid, userData.username, userData.profileUrl, userData.avatarUrl, utfIcon);

        this.users.push(curUser);
        console.log(`${curUser.username} connected! (${this.wsServer.clients.size} clients now)`);

        curUser.send({
            command: 'selfInfo',
            data: curUser.serialize()
        });
        curUser.send({
            command: "setRooms",
            data: this.__serializeRooms()
        });
        this.__sendAll({
            command: "setUsers",
            data: this.__serializeUsers()
        });
    }

    __getUsers(curUser: User): void {
        const users = [];
        this.users.map((user) => users.push(user.serialize()));

        curUser.send({
            to: curUser.id,
            command: 'users',
            data: users
        });
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
            if (this.config.debug) {
                console.log(data)
            }

            if (!data.command) {
                console.log(`incorrect message received: ${message}`);
                return;
            }

            if (data.command === 'pong') {
                if (!curUser.waitingForPong) {
                    curUser.ws.close()
                    return;
                }

                curUser.waitingForPong = false
                curUser.successfulPingTime = performance.now()
            } else if (data.command === 'auth') {
                this.__auth(curUser, data.data);
                return;
            }

            if (!curUser.isAuthenticated()) {
                return;
            }

            if (data.command === 'getUsers') {
                this.__getUsers(curUser);
                return;
            } else if (data.command === "createRoom") {
                let userRoomsAmount = 0
                for (const room of Array.from(this.rooms.values())) {
                    if (room.ownerId === curUser.id) {
                        userRoomsAmount += 1
                    }
                }
                if (userRoomsAmount >= this.__MAXIMUM_ROOMS_PER_USER) {
                    curUser.send({command: "errTooManyRooms"})
                    return;
                }

                const newRoom = new Room(data.data.name, crypto.randomUUID(), curUser);
                this.rooms.set(newRoom.uid, newRoom)
                this.__sendAll({command: "setRooms", data: this.__serializeRooms()})
            } else if (data.command === "deleteRoom") {
                this.rooms.delete(data.data.roomUid);
                this.__sendAll({command: "setRooms", data: this.__serializeRooms()})
            }

            if (data.to) {
                this.__forward(curUser, data.to, data);
                return;
            }
        });

        socket.on('close', () => {
            for (let i = 0; i < this.users.length; i++) {
                if (this.users[i].id === curUser.id) {
                    this.users.splice(i, 1);
                    break;
                }
            }
            if (!curUser.isAuthenticated()) {
                return;
            }
            this.__sendAll({
                command: 'setUsers',
                data: this.__serializeUsers()
            }, curUser.id);
            console.log(`${curUser.username} disconnected!`);
        });
    }

    __sendAll(data: { command: string, data: object | number }, except: number = 0): void {
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

    __serializeRooms(): object[] {
        const serializedRooms: object[] = [];
        Array.from(this.rooms.values()).map((room) => serializedRooms.push(room.serialize()));
        return serializedRooms;
    }

    __serializeUsers(): object[] {
        const serializedUsers: object[] = [];
        this.users.map((user) => serializedUsers.push(user.serialize()))
        return serializedUsers;
    }
}
