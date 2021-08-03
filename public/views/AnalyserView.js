export default class AnalyserView {
    constructor(stream, size = { width: 512, height: 128 }) {
        this.el = document.createElement('canvas');
        this.el.width = size.width;
        this.el.height = size.height;
        this.ctx = this.el.getContext('2d');

        this.analyser = this.__createAnalyser(stream);
    }

    __createAnalyser(stream) {
        const audioCtx = new AudioContext();
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = Math.pow(2, 11);
        source.connect(analyser);

        return analyser;
    }

    render() {
        const { width, height } = this.el;

        const bufferLength = this.analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        this.analyser.getByteTimeDomainData(dataArray);

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
        const sliceWidth = width * 1.0 / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
            const v = dataArray[i] / 128.0;
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
