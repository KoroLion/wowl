import User from '../models/User.js';
import Room from '../models/Room.js';

import {WebRTCAdapter} from "../services/WebRTCAdapter";
import MediaDeviceSelectView from '../views/MediaDeviceSelectView.js';
import RoomsView from '../views/RoomsView.js'
import OnlineUsersView from "../views/OnlineUsersView.js";
import UsersView from '../views/UsersView.js';
import {addMessage, loadMessages} from "../utils/chat.js";

class App {
    stream: MediaStream
    ws: WebSocket
    id: number
    muted: boolean
    online: boolean
    active: boolean
    debug: boolean
    authUrl: string
    users: User[]
    rooms: Map<string, Room>

    usersView: UsersView
    mediaDeviceSelectView: MediaDeviceSelectView
    onlineUsersView: OnlineUsersView
    roomsView: RoomsView

    connectSound: HTMLAudioElement
    messageSound: HTMLAudioElement
    disconnectSound: HTMLAudioElement

    muteBtn: HTMLElement
    messagesDiv: HTMLElement
    messageTextarea: HTMLTextAreaElement
    usernameLink: HTMLLinkElement
    userAvatarImg: HTMLImageElement
    disconnectBtn: HTMLButtonElement
    serviceStatusSpan: HTMLElement
    pcStatusSpan: HTMLElement
    createNewRoomBtn: HTMLButtonElement
    newRoomNameInput: HTMLInputElement

    webrtcAdapter: WebRTCAdapter

    constructor() {
        this.stream = null;
        this.ws = null;

        this.id = null;
        this.muted = false;

        this.online = false;
        this.active = false;

        this.debug = false;
        this.authUrl = null;

        this.users = [];
        this.rooms = new Map();

        this.webrtcAdapter = new WebRTCAdapter((data: SignallingMessageProtocol) => {
            this.send(data)
        })

        this.usersView = new UsersView(document.getElementById("membersList"));
        this.mediaDeviceSelectView = new MediaDeviceSelectView(
            document.getElementById('mediaDeviceSelect') as HTMLInputElement,
            () => {
                window.localStorage.setItem('defaultAudioDeviceId', this.mediaDeviceSelectView.getDeviceId());
            },
            window.localStorage.getItem('defaultAudioDeviceId')
        );
        this.onlineUsersView = new OnlineUsersView(document.getElementById("onlineUsersView"));
        this.roomsView = new RoomsView(
            document.getElementById("voiceRoomsView"),
            this.joinRoom.bind(this),
            (roomUid: string) => {},
            () => {}
        )

        this.connectSound = new Audio('sounds/awu.mp3');
        this.messageSound = new Audio('sounds/pickdilk.mp3')
        this.disconnectSound = new Audio('sounds/wuf.mp3');

        this.muteBtn = document.getElementById("muteBtn")
        this.messagesDiv = document.getElementById("messagesDiv")
        this.messageTextarea = document.getElementById("messageTextarea") as HTMLTextAreaElement
        this.usernameLink = document.getElementById("usernameLink") as HTMLLinkElement
        this.userAvatarImg = document.getElementById("userAvatarImg") as HTMLImageElement
        this.disconnectBtn = document.getElementById("disconnectBtn") as HTMLButtonElement
        this.serviceStatusSpan = document.getElementById("serviceStatusSpan")
        this.pcStatusSpan = document.getElementById("pcStatusSpan")
        this.createNewRoomBtn = document.getElementById("createNewRoomBtn") as HTMLButtonElement;
        this.newRoomNameInput = document.getElementById("newRoomNameInput") as HTMLInputElement;
    }

    joinRoom(roomId: string) {
        const room = this.rooms.get(roomId)
        if (room === undefined) {
            alert("This room does not exist!")
            return;
        }
        this.send({command: "joinRoom", data: {roomId: roomId}});
    }

    async __setActiveRoomReceived(roomId: string) {
        const room = this.rooms.get(roomId)
        if (room === undefined) {
            alert("This room does not exist!")
            return;
        }

        this.stream = await this.__createMediaStream()
        this.mute(this.muted);
        this.setActive(true);

        if (!this.online || this.active) {
            console.log('Unable to join!');
            return;
        }

        for (const user of room.users) {
            if (user.id === this.id) {
                user.stream = this.stream;
                continue
            }

            const offer = await this.webrtcAdapter.createOffer(
                user,
                this.stream,
                (msg: string) => {
                    addMessage(this.messagesDiv, msg)
                    this.messageSound.play()
                },
                (stream: MediaStream) => {
                    user.stream = stream
                }
            );
            this.send({
                to: user.id,
                command: 'webrtc',
                data: {
                    type: "offer",
                    offer: offer
                }
            });
        }
    }

    async __createMediaStream(): Promise<MediaStream> {
        try {
            return await navigator.mediaDevices.getUserMedia({
                audio: {
                    deviceId: this.mediaDeviceSelectView.getDeviceId(),
                    echoCancellation: true,
                    noiseSuppression: true
                },
                video: false
            });
        } catch (e) {
            alert('unable to access mic, try refreshing the page');
            return;
        }
    }

    setOnline(online, connecting = false) {
        this.online = online;

        if (connecting) {
            this.serviceStatusSpan.innerHTML = 'connecting';
            return;
        }

        this.serviceStatusSpan.innerHTML = (online) ? 'online' : 'offline';
    }

    setActive(active) {
        this.active = active;

        if (active) {
            this.disconnectBtn.style.display = null;
        } else {
            this.disconnectBtn.style.display = 'none';
        }

        this.pcStatusSpan.innerHTML = (active) ? 'active' : 'inactive';
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
            if (window.localStorage.getItem('hasMediaPermission') !== "true") {
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

            window.localStorage.setItem('hasMediaPermission', "true");
            return devices;
        } catch (e) {
            window.localStorage.setItem('hasMediaPermission', "false");
            throw (e);
        }
    }

    async init() {
        loadMessages(this.messagesDiv)

        this.muteBtn.addEventListener('click', () => {
            this.mute(!this.muted);
        });
        this.disconnectBtn.addEventListener('click', () => {
            this.leave();
        });
        this.messageTextarea.addEventListener('keypress', (ev) => {
            if (ev.ctrlKey && ev.code === 'Enter') {
                this.sendMessage();
            }
        });
        this.createNewRoomBtn.addEventListener("click", () => {
            this.createNewRoom(this.newRoomNameInput.value)
        })

        try {
            const devices = await this.__getDevices();

            const audioDevices = [];
            devices
                .filter((device) => device.kind === 'audioinput')
                .map((device) => audioDevices.push(device));
            this.mediaDeviceSelectView.render(audioDevices);
        } catch (e) {
            alert('We were unable to access your media devices. Refresh the page.');
            throw (e);
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
                signal: controller.signal
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

    leave() {
        if (this.stream) {
            for (const track of this.stream.getTracks()) {
                track.stop();
            }
        }

        for (const user of this.users) {
            user.close();
        }

        this.users = [];
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
            return `ws://${window.location.hostname}:8080`;
        } else {
            return `wss://${window.location.hostname}/ws/`;
        }
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
                user.close();
                this.users.splice(i, 1);
                break;
            }
        }
        this.usersView.render(this.users);
    }

    async __selfInfoReceived(user) {
        this.userAvatarImg.src = user.avatarUrl;
        this.usernameLink.href = user.profileUrl;
        this.usernameLink.innerText = user.username + user.utfIcon;
    }

    async __setUsersReceived(users) {
        this.onlineUsersView.render(users);
    }

    async __setRoomsReceived(rawRooms: RoomProtocol[]) {
        this.rooms = new Map()
        for (const rawRoom of rawRooms) {
            const roomUsers: User[] = []
            for (const rawUser of rawRoom.users) {
                roomUsers.push(new User(rawUser))
            }
            const room = new Room(rawRoom.uid, rawRoom.name, roomUsers)
            this.rooms.set(room.uid, room);
        }
        this.roomsView.render(rawRooms);
    }

    async __pingReceived() {
        this.send({
            command: "pong"
        })
    }

    async __serverInfoReceived(info, resolve, ws) {
        this.debug = info.debug;
        this.authUrl = info.authUrl;
        this.webrtcAdapter.setIceServers(info.iceServers);
        if (this.debug) {
            console.log('WARNING!!! Running in DEBUG mode!');
        }
        resolve(ws);
    }

    __createWebsocket(): Promise<WebSocket> {
        this.setOnline(false, true);

        return new Promise((resolve, reject) => {
            const wsCommands = {
                serverInfo: (info) => {
                    this.__serverInfoReceived(info, resolve, ws);
                },
                selfInfo: this.__selfInfoReceived.bind(this),
                ping: this.__pingReceived.bind(this),
                setUsers: this.__setUsersReceived.bind(this),
                setRooms: this.__setRoomsReceived.bind(this),
                setActiveRoom: this.__setActiveRoomReceived.bind(this),
                webrtc: this.__webrtcSignalReceived.bind(this),
            };

            const addr = this.__getWsAddr();
            console.log(`WS connecting to ${addr}`);
            const ws = new WebSocket(addr);

            ws.addEventListener('open', async () => {
                this.setOnline(true);
                console.log('Signaling websocket opened! Waiting for server info...');
            });
            ws.addEventListener('close', async () => {
                this.setOnline(false);
                this.leave();
                this.setActive(false);
                console.log('Signaling websocket closed');
                reject(new Error('Unable to open websocket'));
            });

            ws.addEventListener('message', async (ev) => {
                if (this.debug) {
                    console.log(ev.data)
                }

                const data = JSON.parse(ev.data);

                const commandFunction = wsCommands[data.command];
                if (commandFunction) {
                    commandFunction(data.data, data.from, data.to);
                }
            });
        });
    }

    sendMessage() {
        const currentUser = this.__getUser(this.id)
        if (!currentUser) {
            alert('You need to join voice channel first!')
            return
        }

        const content = this.messageTextarea.value
        this.messageTextarea.value = ''

        addMessage(this.messagesDiv, {
            username: currentUser.username,
            avatarUrl: currentUser.avatarUrl,
            datetime: new Date(),
            content: content
        })

        for (const user of this.users) {
            if (user.id !== this.id) {
                user.dc.send(content)
            }
        }
    }

    createNewRoom(name) {
        this.send({
            command: "createRoom",
            data: {
                "name": name
            }
        })
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
        this.muteBtn.innerHTML = (mute) ? 'Unmute' : 'Mute';
    }

    async __webrtcSignalReceived(from: number, data: SignallingData): Promise<void> {
        if (!data.type) {
            console.log("ERROR: WebRTC Signalling message must contain type")
            return;
        }

        const user = this.__getUser(from);
        if (!user) {
            console.log(`ERROR: unable to find user with id = ${from}`);
            return;
        }

        if (data.type == "offer") {
            if (!this.stream) {
                this.stream = await this.__createMediaStream()
                this.mute(this.muted);
                this.setActive(true);
            }

            await this.webrtcAdapter.handleOffer(
                user,
                this.stream,
                data.offer,
                (msg: string) => {
                    addMessage(this.messagesDiv, msg)
                    this.messageSound.play()
                },
                (stream: MediaStream) => {
                    user.stream = stream
                }
            )
        } else if (data.type == "answer") {
            await this.webrtcAdapter.handleAnswer(user, data.answer)
        } else if (data.type === "candidate") {
            await this.webrtcAdapter.handleCandidate(user, data.candidate)
        }
    }
}

export default App;
