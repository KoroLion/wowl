export default class User {
    constructor(userData) {
        this.id = userData.id;
        this.username = userData.username;
        this.utfIcon = userData.utfIcon;
        this.profileUrl = userData.profileUrl;
        this.avatarUrl = userData.avatarUrl;
        this.self = false;
        this.audioEl = null;
        this.pc = null;
        this.dc = null;
        this.stream = null;
    }
    close() {
        if (this.pc) {
            this.pc.close();
        }
    }
}
