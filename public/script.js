const AUTH_URL = 'http://localhost:8000';
const ICE_SERVERS = [
    {
        urls: 'stun:stun.wowl.liokor.com:3478',
        username: 'wowl',
        credential: 'qwerty123'
    },
    {
        urls: 'turn:turn.wowl.liokor.com:3478',
        username: 'wowl',
        credential: 'qwerty123'
    }
];

class App {
    constructor() {
        this.stream = null;
        this.ws = null;

        this.id = null;
        this.username = null;
        this.muted = false;

        this.online = false;
        this.active = false;

        this.users = [];

        this.usersView = new UsersView('membersList');
        this.mediaDeviceSelectView = new MediaDeviceSelectView('mediaDeviceSelect', () => {
            window.localStorage.setItem('defaultAudioDeviceId', this.mediaDeviceSelectView.getDeviceId());
        }, window.localStorage.getItem('defaultAudioDeviceId'));

        this.connectSound = new Audio('sounds/awu.mp3');
        this.disconnectSound = new Audio('sounds/wuf.mp3');
    }

    __getUser(id) {
        for (const user of this.users) {
            if (user.id === id) {
                return user;
            }
        }
        return null;
    }

    async __getPermissions() {
        if (!window.localStorage.getItem('hasMediaPermission')) {
            alert('We will ask you to give us permission to access your camera and mic. We need this to display the list of your devives. We won\'t use them until you join the voice channel.');
        }
        return await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
    }

    async init() {
        let stream = null;

        try {
            stream = await this.__getPermissions();
        } catch (e) {
            window.localStorage.getItem('hasMediaPermission', false)
            alert('We were unable to access your media devices. Refresh the page.');
            return;
        }
        window.localStorage.setItem('hasMediaPermission', true)

        const devices = await navigator.mediaDevices.enumerateDevices();

        const audioDevices = []
        devices
            .filter((device) => device.kind === 'audioinput')
            .map((device) => audioDevices.push(device));
        this.mediaDeviceSelectView.render(audioDevices);

        for (const track of stream.getTracks()) {
            track.stop();
        }
    }

    async connect() {
        if (this.online) {
            return;
        }

        try {
            this.ws = await this.__createWebsocket();
        } catch (e) {
            alert('unable to connect to WS server, please try again later');
            return;
        }

        const jwt = await this.auth();
        /*const data = JSON.parse(atob(jwt.split('.')[1]));
        const username = data.username;
        usernameSpan.innerHTML = username;*/

        this.send({
            command: 'auth',
            data: jwt
        });
    }

    async auth() {
        const res = await fetch(`${AUTH_URL}/profile/api/jwt_token/`, {
            method: 'post',
            mode: 'cors',
            credentials: 'include',
        });
        if (res.ok) {
            return await res.text();
        } else {
            console.log('User is not authenticated! Redirecting...');
            document.location.replace(`${AUTH_URL}/?next=${window.location.origin}`);
        }
    }

    async join() {
        if (this.active) {
            return;
        }

        try {
            this.stream = await await navigator.mediaDevices.getUserMedia({
                audio: {
                    deviceId: this.mediaDeviceSelectView.getDeviceId(),
                    echoCancellation: true,
                    noiseSuppression: true
                },
                video: false,
            });
            console.log('Media stream created');
            console.log(this.stream.getTracks()[0].getSettings());
        } catch (e) {
            alert('unable to access mic, try refreshing the page');
            return;
        }

        this.send({
            command: 'getUsers'
        });
    }

    leave() {
        if (this.stream) {
            for (const track of this.stream.getTracks()) {
                track.stop();
            }
        }

        for (const user of this.users) {
            if (user.pc) {
                user.pc.close();
            }

            if (user.audioEl) {
                user.audioEl.remove();
            }
        }

        this.users = []
        this.usersView.render(this.users);
    }

    close() {
        if (this.ws) {
            this.ws.close();
        }

        lobbyStatus.innerHTML = 'offline';
    }

    send(data) {
        if (this.online) {
            this.ws.send(JSON.stringify(data));
        }
    }

    __getWsAddr() {
        if (window.location.hostname === 'localhost') {
            return `ws://localhost:8081`;
        } else {
            return `wss://${window.location.hostname}/ws/`;
        }
    }

    __candidateReceived(candidate, from) {
        const user = this.__getUser(from);
        console.log(`RTC candidate received from ${user.username}`);

        user.pc.addIceCandidate(candidate);
    }

    async __offerReceived(offer, from) {
        const user = this.__getUser(from);
        if (!user) {
            console.log(`ERROR: unable to find user with id = ${from}`);
            return;
        }
        console.log(`RTC offer received from ${user.username}`);

        user.pc = await this.__createPeerConnection(user.id, this.stream);
        await user.pc.setRemoteDescription(offer);
        const answer = await user.pc.createAnswer();
        await user.pc.setLocalDescription(answer);
        this.send({
            to: user.id,
            command: 'answer',
            data: answer
        });
    }

    async __answerReceived(answer, from) {
        const user = this.__getUser(from);

        if (!user) {
            console.log(`ERROR: unable to find user with id = ${from}`);
            return;
        }

        console.log(`RTC answer received from ${user.username}`);

        if (!user.pc) {
            console.log(`ERROR: ${user.username} does not have peer connection!`);
            return;
        }

        await user.pc.setRemoteDescription(answer);
    }

    async addUser(user) {
        console.log(`${user.username} connected`);
        this.connectSound.play();
        this.users.push(user);
        this.usersView.render(this.users);
    }

    async deleteUser(id) {
        for (let i = 0; i < this.users.length; i++) {
            const user = this.users[i];
            if (user.id === id) {
                console.log(`${user.username} disconnected`);
                this.disconnectSound.play();
                if (user.pc) {
                    user.pc.close();
                }
                if (user.audioEl) {
                    user.audioEl.remove();
                }
                this.users.splice(i, 1);
                break;
            }
        }
        this.usersView.render(this.users);
    }

    async __createAnalyser(stream) {
        return new AnalyserView(stream);
    }

    async __usersReceived(users, from, to) {
        this.id = to;
        this.users = [];

        for (let user of users) {
            user = new User(user.id, user.username);
            this.addUser(user);

            if (user.id === this.id) {
                user.stream = this.stream;
                user.audioEl = this.__createAudioEl(this.stream, false);
                user.analyser = await this.__createAnalyser(this.stream);
                this.usersView.render(this.users);
            } else {
                user.pc = this.__createPeerConnection(user.id, this.stream);
                const offer = await user.pc.createOffer({
                    offerToReceiveAudio: 1
                });
                await user.pc.setLocalDescription(offer);

                this.send({
                    to: user.id,
                    command: 'offer',
                    data: offer
                });
            }
        }
    }

    async __selfInfoReceived(user) {
        userAvatarImg.src = user.avatarUrl;
        usernameLink.href = user.profileUrl;
        usernameLink.innerHTML = user.username + user.utfIcon;
    }

    async __connectedReceived(user) {
        user = new User(user.id, user.username);
        this.addUser(user);
    }

    async __disconnectedReceived(id) {
        this.deleteUser(id);
    }

    __createWebsocket() {
        lobbyStatus.innerHTML = 'connecting';

        return new Promise((resolve, reject) => {
            const wsCommands = {
                'selfInfo': this.__selfInfoReceived.bind(this),
                'candidate': this.__candidateReceived.bind(this),
                'offer': this.__offerReceived.bind(this),
                'answer': this.__answerReceived.bind(this),
                'users': this.__usersReceived.bind(this),
                'connected': this.__connectedReceived.bind(this),
                'disconnected': this.__disconnectedReceived.bind(this)
            }

            const addr = this.__getWsAddr();
            console.log(`WS connecting to ${addr}`);
            const ws = new WebSocket(addr);

            ws.addEventListener('open', async (ev) => {
                this.online = true;
                lobbyStatus.innerHTML = 'online';
                console.log('Signaling websocket opened');
                resolve(ws);
            });
            ws.addEventListener('close', async (ev) => {
                this.online = false;
                lobbyStatus.innerHTML = 'offline';
                console.log('Signaling websocket closed');
                reject();
            });

            ws.addEventListener('message', async (ev) => {
                const data = JSON.parse(ev.data);

                const commandFunction = wsCommands[data.command];
                if (commandFunction) {
                    commandFunction(data.data, data.from, data.to);
                }
            });
        });
    }

    __createAudioEl(stream, play = true) {
        const audio = document.createElement('audio');
        audio.controls = 'controls';
        audio.srcObject = stream;
        audio.style.width = '512px';
        if (play) {
            audio.play();
        }
        return audio;
    }

    __createPeerConnection(id, stream) {
        const user = this.__getUser(id);

        const pc = new RTCPeerConnection({
            iceServers: ICE_SERVERS
        });

        for (const track of stream.getTracks()) {
            pc.addTrack(track, stream);
        }

        pc.addEventListener('icecandidate', (ev) => {
            if (!ev.candidate) {
                return;
            }

            this.send({
                to: id,
                command: 'candidate',
                data: ev.candidate
            });
        });

        pc.addEventListener('connectionstatechange', () => {
            console.log(`RTC status changed for ${id}: ${pc.connectionState}`);
        });

        pc.addEventListener('track', async (ev) => {
            user.audioEl = this.__createAudioEl(ev.streams[0]);
            user.analyser = await this.__createAnalyser(ev.streams[0]);

            this.usersView.render(this.users);
        });

        return pc;
    }

    mute(mute = true) {
        if (this.stream) {
            const tracks = this.stream.getTracks();
            for (const track of tracks) {
                if (track.kind === 'audio') {
                    track.enabled = !mute;
                }
            }
        }

        this.muted = mute;
        muteBtn.innerHTML = (mute)? 'Unmute': 'Mute';
    }
}

async function main() {
    const app = new App();
    await app.init();
    await app.connect();
    await app.join();

    window.addEventListener('beforeunload', (e) => {
        app.close()
    });

    muteBtn.addEventListener('click', () => {
        app.mute(!app.muted);
    });
    wolcharnia.addEventListener('click', () => {
        app.join();
    });
    disconnectBtn.addEventListener('click', () => {
        app.leave();
    });
}

window.addEventListener('load', main);
