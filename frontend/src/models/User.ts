export default class User {
    id: number
    username: string
    utfIcon: string
    profileUrl: string
    avatarUrl: string

    self: boolean
    audioEl: HTMLAudioElement
    pc: RTCPeerConnection
    dc: RTCDataChannel
    stream: MediaStream

    constructor(userData: UserProtocol) {
        this.id = userData.id;
        this.username = userData.username;
        this.utfIcon = userData.utfIcon;
        this.profileUrl = userData.profileUrl;
        this.avatarUrl = userData.avatarUrl;

        this.self = false

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
