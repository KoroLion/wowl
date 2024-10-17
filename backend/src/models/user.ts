import * as ws from 'ws';


export default class User {
    id: number
    ws: ws.WebSocket
    connectedTime: DOMHighResTimeStamp
    successfulPingTime: DOMHighResTimeStamp
    waitingForPong: boolean

    authenticated: boolean
    uid: number
    username: string
    profileUrl: string
    avatarUrl: string
    utfIcon: string

    constructor(id: number, ws: ws.WebSocket) {
        this.id = id;
        this.ws = ws;

        this.connectedTime = performance.now();
        this.successfulPingTime = performance.now()
        this.waitingForPong = false

        this.authenticated = false;
        this.uid = null
        this.username = null;
        this.profileUrl = null;
        this.avatarUrl = null;
        this.utfIcon = null;
    }

    authenticate(uid: number, username: string, profileUrl: string, avatarUrl: string, utfIcon: string): void {
        this.authenticated = true
        this.uid = uid
        this.username = username
        this.profileUrl = profileUrl
        this.avatarUrl = avatarUrl
        this.utfIcon = utfIcon
    }

    isAuthenticated(): boolean {
        return this.authenticated;
    }

    send(data) {
        this.ws.send(JSON.stringify(data));
    }

    serialize(): object {
        return {
            id: this.id,
            username: this.username,
            profileUrl: this.profileUrl,
            avatarUrl: this.avatarUrl,
            utfIcon: this.utfIcon
        };
    }
}
