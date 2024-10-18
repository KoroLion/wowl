import {WebSocket} from 'ws';
import * as jwt from "jsonwebtoken"
import * as assert from "node:assert";

interface MessageProtocol {
    from?: number,
    to?: number,
    command: string,
    data?: any
}

interface RoomInterface {
    uid: string
}


class TestFramework {
    __SERVER_ADDR = 'ws://localhost:8080'
    __JWT_PRIVATE_TOKEN = "hng3ou3hbi0543h09543[09ghwph5y-9jhw-93h5pkwphrgp-9ypghw35ihgpwh3508hgp5i3hyoi"
    __UID = 4

    ws: WebSocket
    commandPromiseResolves: Map<string, ((value: MessageProtocol) => void)[]>

    constructor() {
        this.ws = new WebSocket(this.__SERVER_ADDR);
        this.commandPromiseResolves = new Map()
    }

    send(data: MessageProtocol) {
        const dataStr = JSON.stringify(data);
        console.log(`<---: ${dataStr}`)
        this.ws.send(dataStr)
    }

    async waitForCommand(command: string, waitSec: number = 10): Promise<MessageProtocol> {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve(null)
            }, waitSec * 1000)
            const resolves = this.commandPromiseResolves.get(command)
            if (!resolves) {
                this.commandPromiseResolves.set(command, [resolve])
            } else {
                resolves.push(resolve)
            }
        })
    }

    test() {
        this.ws.on('error', console.error);

        this.ws.on('open', async () => {
            const token = jwt.sign({
                "uid": 4,
                "username": "KoroLion",
                "profileUrl": "http://localhost:8000/@KoroLion/",
                "avatarUrl": "https://secure.gravatar.com/avatar/c0c595b10747ee51b08e5db7974691e0?s=512&d=identicon",
                "utfIcon": "",
                "exp": (Date.now() / 1000) + 100
            }, this.__JWT_PRIVATE_TOKEN)
            this.send({command: "auth", data: token});
            assert.equal((await this.__getMyRooms()).length, 0)

            this.send({command: "createRoom", data: {name: "room1"}})
            assert.equal((await this.__getMyRooms()).length, 1)

            this.send({command: "createRoom", data: {name: "room2"}})
            const myRooms = await this.__getMyRooms()
            assert.equal(myRooms.length, 2)

            for (const room of myRooms) {
                this.send({command: "deleteRoom", data: {roomUid: room.uid}})
            }
            assert.equal((await this.__getMyRooms()).length, 1)
            assert.equal((await this.__getMyRooms()).length, 0)
        });

        this.ws.on('message', (rawData) => {
            console.log('--->: %s', rawData);

            const data = JSON.parse(rawData.toString())

            if (data.command === "ping") {
                this.send({command: "pong"})
            } else {
                const resolves = this.commandPromiseResolves.get(data.command)
                if (resolves) {
                    for (const resolve of resolves) {
                        resolve(data)
                    }
                }
                this.commandPromiseResolves.set(data.command, null)
            }
        });

        this.ws.on("close", () => {console.log("Connection closed!")})
    }

    async __getMyRooms(): Promise<RoomInterface[]> {
        const rooms = (await this.waitForCommand("setRooms")).data

        const myRooms = []
        rooms.map((room) => {if (room.ownerUid === this.__UID) { myRooms.push(room); }})

        return myRooms
    }
}


(new TestFramework()).test()
