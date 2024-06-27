export default class AnalyserView {
    constructor(stream, size = { width: 512, height: 128 }, user = null) {
        this.el = document.createElement('canvas');
        this.el.width = size.width;
        this.el.height = size.height;
        this.user = user;

        this.ctx = this.el.getContext('2d');

        this.analyser = this.__createAnalyser(stream);

        this.bufferLength = this.analyser.frequencyBinCount;
        this.dataArray = new Uint8Array(this.bufferLength);
    }

    __createAnalyser(stream) {
        const audioCtx = new AudioContext();
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = Math.pow(2, 11);
        source.connect(analyser);

        return analyser;
    }

    // use after render()
    getVolume() {
        return Math.max(...this.dataArray.map(Math.abs)) - 128;
    }

    render() {
        const { width, height } = this.el;

        this.analyser.getByteTimeDomainData(this.dataArray);

        const ctx = this.ctx;
        ctx.fillStyle = '#202020';
        ctx.fillRect(0, 0, width, height);

        ctx.strokeStyle = 'black';
        ctx.beginPath();
        ctx.moveTo(0, Math.round(height / 2));
        ctx.lineTo(width, Math.round(height / 2));
        ctx.stroke();

        ctx.strokeStyle = '#FAFAFA';
        ctx.beginPath();
        const sliceWidth = width * 1.0 / this.bufferLength;
        let x = 0;

        for (let i = 0; i < this.bufferLength; i++) {
            const v = this.dataArray[i] / 128.0;
            const y = v * height / 2;

            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }

            x += sliceWidth;
        }

        ctx.lineTo(width, height / 2);
        ctx.stroke();
    }

    remove() {
        this.el.remove();
    }
}
