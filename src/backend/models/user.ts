import * as perfHooks from 'perf_hooks';
import * as ws from 'ws';


export default class User {
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
