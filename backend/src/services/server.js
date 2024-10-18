"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const http = require("http");
const express = require("express");
const ws = require("ws");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const user_1 = require("../models/user");
const room_1 = require("../models/room");
class Server {
    constructor(config) {
        this.__PING_INTERVAL_MS = 10000;
        this.__MAXIMUM_ROOMS_PER_USER = 2;
        this.__DEBUG_USERNAMES = [
            'Kiba', 'Toboe', 'Hige', 'Tsume', 'Blue',
            'Leo', 'Kova', 'Jake', 'Kobb',
            'Wolf', 'Fang', 'Thane', 'River'
        ];
        this.curId = 1;
        this.config = config;
        this.httpServer = this.__createHttpServer();
        this.wsServer = new ws.Server({ server: this.httpServer });
        this.users = [];
        this.rooms = new Map();
    }
    listen() {
        this.wsServer.on('listening', () => {
            const addr = this.wsServer.address();
            if (typeof (addr) === "string") {
                console.log(`WS server is listening at ${addr}`);
            }
            else {
                console.log(`WS server is listening at ${addr.address}:${addr.port}`);
            }
        });
        this.wsServer.on('connection', (socket) => {
            this.__connectionHandler(socket);
        });
        this.pingInterval = setInterval(() => {
            this.users.map((user) => {
                if (performance.now() - user.successfulPingTime > this.__PING_INTERVAL_MS * 3) {
                    user.ws.close();
                }
                else {
                    user.waitingForPong = true;
                    user.send({ "command": "ping" });
                }
            });
        }, this.__PING_INTERVAL_MS);
        this.httpServer.listen(this.config.port);
    }
    __createHttpServer() {
        const app = express();
        return http.createServer(app);
    }
    __forward(curUser, to, data) {
        const user = this.__getUser(to);
        if (user === null) {
            console.log(`User with id = ${to} was not found!`);
            return;
        }
        data.from = curUser.id;
        user.send(data);
    }
    __auth(curUser, token) {
        let userData;
        try {
            userData = jwt.verify(token, this.config.jwtKey);
        }
        catch (_a) {
            console.log('WARN: User with incorrect token was kicked');
            curUser.ws.close();
            return;
        }
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
    __getUsers(curUser) {
        const users = [];
        this.users.map((user) => users.push(user.serialize()));
        curUser.send({
            to: curUser.id,
            command: 'users',
            data: users
        });
    }
    __connectionHandler(socket) {
        const curUser = new user_1.default(this.curId++, socket);
        curUser.send({
            command: 'serverInfo',
            data: {
                debug: this.config.debug,
                authUrl: this.config.authUrl,
                iceServers: this.config.iceServers,
            }
        });
        socket.on('message', (message) => {
            const data = JSON.parse(message);
            if (this.config.debug) {
                console.log(data);
            }
            if (!data.command) {
                console.log(`incorrect message received: ${message}`);
                return;
            }
            if (data.command === 'pong') {
                if (!curUser.waitingForPong) {
                    curUser.ws.close();
                    return;
                }
                curUser.waitingForPong = false;
                curUser.successfulPingTime = performance.now();
            }
            else if (data.command === 'auth') {
                this.__auth(curUser, data.data);
                return;
            }
            if (!curUser.isAuthenticated()) {
                return;
            }
            if (data.command === 'getUsers') {
                this.__getUsers(curUser);
                return;
            }
            else if (data.command === "createRoom") {
                let userRoomsAmount = 0;
                for (const room of this.rooms.values()) {
                    if (room.ownerId === curUser.id || room.ownerUid === curUser.uid) {
                        userRoomsAmount += 1;
                    }
                }
                if (userRoomsAmount >= this.__MAXIMUM_ROOMS_PER_USER) {
                    curUser.send({ command: "error", data: { type: "errTooManyRooms", message: "Too many rooms!" } });
                    return;
                }
                const newRoom = new room_1.default(data.data.name, crypto.randomUUID(), curUser);
                this.rooms.set(newRoom.uid, newRoom);
                this.__sendAll({ command: "setRooms", data: this.__serializeRooms() });
            }
            else if (data.command === "deleteRoom") {
                const room = this.rooms.get(data.data.roomUid);
                if (room.ownerUid !== curUser.uid) {
                    curUser.send({ command: "error", data: { type: "err", message: "Permission denied!" } });
                    return;
                }
                this.rooms.delete(room.uid);
                this.__sendAll({ command: "setRooms", data: this.__serializeRooms() });
            }
            else if (data.command === "webrtc") {
                const room = this.__getUserRoom(curUser);
                if (!room.hasUser(data.to)) {
                    curUser.send({ command: "error", data: { type: "errNotInTheSameRoom", message: "Only allowed to send WebRTC signals to users in the same room!" } });
                    return;
                }
                this.__forward(curUser, data.to, data);
            }
            else if (data.command === "joinRoom") {
                const currentRoom = this.__getUserRoom(curUser);
                if (currentRoom) {
                    currentRoom.removeUser(curUser.id);
                }
                const room = this.rooms.get(data.data.roomId);
                if (!room) {
                    return;
                }
                room.addUser(curUser);
                this.__sendAll({
                    command: "setRooms",
                    data: this.__serializeRooms()
                });
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
    __sendAll(data, except = 0) {
        for (const user of this.users) {
            if (user.id !== except) {
                user.send(data);
            }
        }
    }
    __getUser(id) {
        for (const user of this.users) {
            if (user.id === id) {
                return user;
            }
        }
        return null;
    }
    __getUserRoom(user) {
        for (const room of this.rooms.values()) {
            if (room.hasUser(user.id)) {
                return room;
            }
        }
        return null;
    }
    __getRandomDebugUsername() {
        return this.__DEBUG_USERNAMES[Math.round(Math.random() * (this.__DEBUG_USERNAMES.length - 1))];
    }
    __serializeRooms() {
        const serializedRooms = [];
        Array.from(this.rooms.values()).map((room) => serializedRooms.push(room.serialize()));
        return serializedRooms;
    }
    __serializeUsers() {
        const serializedUsers = [];
        this.users.map((user) => serializedUsers.push(user.serialize()));
        return serializedUsers;
    }
}
exports.default = Server;
