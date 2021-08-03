import User from './User.js';

import { MediaDeviceSelectView } from '../views/MediaDeviceSelectView.js';
import { AnalyserView, UsersView } from '../views/views.js';

class App {
    constructor() {
        this.debug = false;
        this.stream = null;
        this.ws = null;

        this.id = null;
        this.muted = false;

        this.online = false;
        this.active = false;

        this.authUrl = null;
        this.iceServers = null;

        this.users = [];

        this.usersView = new UsersView('membersList');
        this.mediaDeviceSelectView = new MediaDeviceSelectView('mediaDeviceSelect', () => {
            window.localStorage.setItem('defaultAudioDeviceId', this.mediaDeviceSelectView.getDeviceId());
        }, window.localStorage.getItem('defaultAudioDeviceId'));

        this.connectSound = new Audio('sounds/awu.mp3');
        this.disconnectSound = new Audio('sounds/wuf.mp3');
    }

    setOnline(online, connecting = false) {
        this.online = online;

        if (connecting) {
            serviceStatusSpan.innerHTML = 'connecting';
            return;
        }

        serviceStatusSpan.innerHTML = (online)? 'online': 'offline';
    }

    setActive(active) {
        this.active = active;

        if (active) {
            disconnectBtn.style.display = null;
            statsBtn.style.display = null;
        } else {
            disconnectBtn.style.display = 'none';
            disconnectBtn.style.display = 'none';
        }

        pcStatusSpan.innerHTML = (active)? 'active': 'inactive';
    }

    __getUser(id) {
        for (const user of this.users) {
            if (user.id === id) {
                return user;
            }
        }
        return null;
    }

    async __getDevices() {
        try {
            if (!window.localStorage.getItem('hasMediaPermission')) {
                alert('We will ask you to give us permission to access your camera and mic. We need this to display the list of your devives. We won\'t use them until you join the voice channel.');
            }
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: false
            });

            const devices = await navigator.mediaDevices.enumerateDevices();

            for (const track of stream.getTracks()) {
                track.stop();
            }

            window.localStorage.setItem('hasMediaPermission', true)
            return devices;
        } catch (e) {
            window.localStorage.getItem('hasMediaPermission', false)
            throw(e);
        }
    }

    async init() {
        try {
            const devices = await this.__getDevices();

            const audioDevices = []
            devices
                .filter((device) => device.kind === 'audioinput')
                .map((device) => audioDevices.push(device));
            this.mediaDeviceSelectView.render(audioDevices);
        } catch (e) {
            alert('We were unable to access your media devices. Refresh the page.');
            throw(e);
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

        let jwt = '';
        if (!this.debug) {
            jwt = await this.auth();
        }
        this.send({
            command: 'auth',
            data: jwt
        });
    }

    async auth() {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 2500);
            const res = await fetch(`${this.authUrl}/profile/api/jwt_token/`, {
                method: 'post',
                mode: 'cors',
                credentials: 'include',
                signal: controller.signal,
            });
            clearTimeout(timeout);

            if (res.ok) {
                return await res.text();
            } else {
                console.log('User is not authenticated! Redirecting...');
                document.location.replace(`${this.authUrl}/?next=${window.location.origin}`);
            }
        } catch (e) {
            console.log('ERROR: Unable to access auth server!');
            return '';
        }
    }

    async join() {
        if (!this.online || this.active) {
            console.log('Unable to join!');
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
            this.mute(this.muted);
            console.log(this.stream.getTracks()[0].getSettings());
        } catch (e) {
            alert('unable to access mic, try refreshing the page');
            return;
        }

        this.send({
            command: 'getUsers'
        });
        this.setActive(true);
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

        this.setActive(false);
    }

    close() {
        if (this.ws) {
            this.ws.close();
        }
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
        if (!user) {
            console.log(`ERROR: unable to find user with id = ${from}`);
            return;
        }
        console.log(`RTC candidate received from ${user.username}: ${candidate.candidate}`);

        try {
            user.pc.addIceCandidate(candidate);
        } catch (e) {
            console.log(`Unable to add candidate from ${user.username}`);
        }
    }

    async __offerReceived(offer, from) {
        const user = this.__getUser(from);
        if (!user) {
            console.log(`ERROR: unable to find user with id = ${from}`);
            return;
        }
        console.log(`RTC offer received from ${user.username}`);

        user.pc = await this.__createPeerConnection(user, this.stream);
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

        for (let userData of users) {
            const user = new User(userData);
            this.addUser(user);

            if (user.id === this.id) {
                user.stream = this.stream;
                user.audioEl = this.__createAudioEl(this.stream, false);
                user.analyser = await this.__createAnalyser(this.stream);
                this.usersView.render(this.users);
            } else {
                user.pc = this.__createPeerConnection(user, this.stream);
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
        this.addUser(new User(user));
    }

    async __disconnectedReceived(id) {
        this.deleteUser(id);
    }

    async __serverInfoReceived(info, resolve, ws) {
        this.debug = info.debug;
        this.authUrl = info.authUrl;
        this.iceServers = info.iceServers;
        if (this.debug) {
            console.log('WARNING!!! Running in DEBUG mode!');
        }
        resolve(ws);
    }

    __createWebsocket() {
        this.setOnline(false, true);

        return new Promise((resolve, reject) => {
            const wsCommands = {
                'serverInfo': (info) => {
                    this.__serverInfoReceived(info, resolve, ws);
                },
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
                this.setOnline(true);
                console.log('Signaling websocket opened! Waiting for server info...');
            });
            ws.addEventListener('close', async (ev) => {
                this.setOnline(false);
                this.leave();
                this.setActive(false);
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
        // todo: this should be in views
        const audio = document.createElement('audio');
        audio.controls = 'controls';
        audio.srcObject = stream;
        audio.style.width = '512px';
        if (play) {
            audio.play();
        }
        return audio;
    }

    __createPeerConnection(user, stream) {
        const pc = new RTCPeerConnection({
            iceServers: this.iceServers,
        });

        for (const track of stream.getTracks()) {
            pc.addTrack(track, stream);
        }

        pc.addEventListener('icecandidate', (ev) => {
            if (!ev.candidate) {
                return;
            }

            this.send({
                to: user.id,
                command: 'candidate',
                data: ev.candidate
            });
        });

        pc.addEventListener('iceconnectionstatechange', () => {
            console.log(`RTC status changed for ${user.username}: ${pc.iceConnectionState}`);
        });

        pc.addEventListener('track', async (ev) => {
            // todo: refactor this to only add stream to user
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

    async infoToConsole() {
        if (this.active) {
            for (const user of this.users) {
                if (user.pc) {
                    console.log(`RTC report for ${user.username}:`);

                    let localCandidateId = null, remoteCandidateId = null;
                    const stats = await user.pc.getStats(null);
                    // we need to use .forEach to get entries
                    stats.forEach((report) => {
                        if (report.type === 'candidate-pair' && report.nominated && report.selected) {
                            console.log(report);
                            localCandidateId = report.localCandidateId;
                            remoteCandidateId = report.remoteCandidateId;
                        }
                    });

                    if (localCandidateId && remoteCandidateId) {
                        stats.forEach((report) => {
                            if (report.type === 'local-candidate' && report.id === localCandidateId) {
                                console.log(report);
                            } else if (report.type === 'remote-candidate' && report.id == remoteCandidateId) {
                                console.log(report);
                            }/* else if (['inbound-rtp', 'outbound-rtp', 'remote-inbound-rtp', 'remote-outbound-rtp'].includes(report.type)) {
                                console.log(report);
                            }*/ // uncomment for connection info
                        });
                    } else {
                        console.log('RTC connection not established yet!');
                    }
                }
            }
        }
    }
}

export default App;
