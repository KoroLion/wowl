class User {
    constructor(id, username) {
        this.id = id;
        this.username = username;

        this.analyser = null;
        this.audioEl = null;
        this.oscEl = null;

        this.pc = null;
        this.stream = null;
    }
}
