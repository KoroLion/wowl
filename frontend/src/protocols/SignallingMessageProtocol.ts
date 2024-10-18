interface SignallingData {
    type: string,
    candidate?: RTCIceCandidate,
    answer?: RTCSessionDescriptionInit,
    offer?: RTCSessionDescriptionInit
}

interface SignallingMessageProtocol {
    to?: number,
    from?: number,
    command: string,
    data: SignallingData
}
