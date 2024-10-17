"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class User {
    constructor(id, ws) {
        this.id = id;
        this.ws = ws;
        this.connectedTime = performance.now();
        this.successfulPingTime = performance.now();
        this.waitingForPong = false;
        this.authenticated = false;
        this.uid = null;
        this.username = null;
        this.profileUrl = null;
        this.avatarUrl = null;
        this.utfIcon = null;
    }
    authenticate(uid, username, profileUrl, avatarUrl, utfIcon) {
        this.authenticated = true;
        this.uid = uid;
        this.username = username;
        this.profileUrl = profileUrl;
        this.avatarUrl = avatarUrl;
        this.utfIcon = utfIcon;
    }
    isAuthenticated() {
        return this.authenticated;
    }
    send(data) {
        this.ws.send(JSON.stringify(data));
    }
    serialize() {
        return {
            id: this.id,
            username: this.username,
            profileUrl: this.profileUrl,
            avatarUrl: this.avatarUrl,
            utfIcon: this.utfIcon
        };
    }
}
exports.default = User;
