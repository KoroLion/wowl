import {addMessage} from "../utils/chat";
import User from "../models/User";

export class WebRTCAdapter {
    __DATACHANNEL_NAME = "chat"

    iceServers: RTCIceServer[]

    constructor() {
        this.iceServers = null;
    }

    setIceServers(iceServers: RTCIceServer[]) {
        this.iceServers = iceServers
    }

    createPeerConnection(
        user: User,
        stream: MediaStream,
        messageReceivedCallback: (msg: string) => void,
        rtcCandidateFoundCallback: (candidate: RTCIceCandidate) => void,
        rtcTrackReceivedCallback: (stream: MediaStream) => void
    ): void {
        if (!this.iceServers) {
            throw new Error('iceServers are null!');
        }

        user.pc = new RTCPeerConnection({
            iceServers: this.iceServers
        });
        user.dc = user.pc.createDataChannel(this.__DATACHANNEL_NAME);

        for (const track of stream.getTracks()) {
            user.pc.addTrack(track, stream);
        }

        user.pc.addEventListener('icecandidate', (ev) => {
            if (!ev.candidate) {
                return;
            }
            rtcCandidateFoundCallback(ev.candidate)

        });
        user.pc.addEventListener('iceconnectionstatechange', () => {
            console.log(`RTC status changed for ${user.username}: ${user.pc.iceConnectionState}`);
        });
        user.pc.addEventListener('track', async (ev) => {
            rtcTrackReceivedCallback(ev.streams[0])
        });
        user.pc.addEventListener('datachannel', (ev) => {
            console.log('Data channel created!')
            ev.channel.addEventListener('message', (ev) => {
                messageReceivedCallback(ev.data)
            })
        })
    }

    async createOffer(
        user: User,
        stream: MediaStream,
        messageReceivedCallback: (msg: string) => void,
        rtcCandidateFoundCallback: (candidate: RTCIceCandidate) => void,
        rtcTrackReceivedCallback: (stream: MediaStream) => void
    ): Promise<RTCSessionDescriptionInit> {
        this.createPeerConnection(user, stream, messageReceivedCallback, rtcCandidateFoundCallback, rtcTrackReceivedCallback)

        const offer = await user.pc.createOffer({
            offerToReceiveAudio: true
        });
        await user.pc.setLocalDescription(offer);

        return offer;
    }

    async handleOffer(
        user: User,
        stream: MediaStream,
        offer: RTCSessionDescriptionInit,
        messageReceivedCallback: (msg: string) => void,
        rtcCandidateFoundCallback: (candidate: RTCIceCandidate) => void,
        rtcTrackReceivedCallback: (stream: MediaStream) => void
    ): Promise<RTCSessionDescriptionInit> {
        console.log(`RTC offer received from ${user.username}`);

        this.createPeerConnection(user, stream, messageReceivedCallback, rtcCandidateFoundCallback, rtcTrackReceivedCallback);

        await user.pc.setRemoteDescription(offer);
        const answer = await user.pc.createAnswer();
        await user.pc.setLocalDescription(answer);

        return answer
    }

    async handleAnswer(user: User, answer: RTCSessionDescriptionInit): Promise<void> {
        console.log(`RTC answer received from ${user.username}`);

        if (!user.pc) {
            console.log(`ERROR: ${user.username} does not have peer connection!`);
            return;
        }

        await user.pc.setRemoteDescription(answer);
    }

    async handleCandidate(user: User, candidate: RTCIceCandidate): Promise<void> {
        console.log(`RTC candidate received from ${user.username}: ${candidate.candidate}`);
        try {
            await user.pc.addIceCandidate(candidate);
        } catch (err) {
            console.log(`Unable to add candidate from ${user.username}: ${err.toString()}`);
        }
    }
}
