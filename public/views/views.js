export class AnalyserView {
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
            let v = dataArray[i] / 128.0;
            let y = v * height  / 2;

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

export class UsersView {
    constructor(elId) {
        this.el = document.getElementById(elId);
        this.users = [];

        this.analysers = [];
        this.audios = [];

        this.width = 512;

        const render = () => {
            for (const analyser of this.analysers) {
                analyser.render();
            }

            requestAnimationFrame(render);
        }
        render();
    }

    clear() {
        this.users = [];

        for (const audio of this.audios) {
            audio.remove();
        }
        this.audios = [];

        for (const analyser of this.analysers) {
            analyser.remove();
        }
        this.analysers = [];

        this.el.innerHTML = '';
    }

    render(users = null) {
        this.clear();
        if (!users) {
            return;
        }

        this.users = users;
        for (const user of users) {
            const li = document.createElement('li');
            li.innerHTML = `
                <a href="${user.profileUrl}" target="_blank">
                    <img src="${user.avatarUrl}" width="32" height="32">
                    <strong>${user.username}${user.utfIcon}</strong>
                </a>
            `;
            if (user.stream) {
                li.appendChild(document.createElement('br'));

                const audioEl = document.createElement('audio');
                audioEl.controls = 'controls';
                audioEl.srcObject = user.stream;
                audioEl.style.width = `${this.width}px`;
                if (!user.self) {
                    audioEl.play();
                }
                this.audios.push(audioEl);
                li.appendChild(audioEl);

                li.appendChild(document.createElement('br'));

                const analyserView = new AnalyserView(user.stream, {
                    width: this.width,
                    height: 128
                });
                this.analysers.push(analyserView);
                li.appendChild(analyserView.el);
            }
            this.el.appendChild(li);
        }
    }
}
