class User {
    constructor(userData = {}) {
        this.id = userData.id;
        this.username = userData.username;
        this.utfIcon = userData.utfIcon;
        this.profileUrl = userData.profileUrl;
        this.avatarUrl = userData.avatarUrl;

        this.analyser = null;
        this.audioEl = null;
        this.oscEl = null;

        this.pc = null;
        this.stream = null;
    }
}
