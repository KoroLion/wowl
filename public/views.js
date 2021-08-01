class AnalyserView {
    __createAnalyser(stream) {
        const audioCtx = new AudioContext();
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 4096;
        source.connect(analyser);

        return analyser;
    }

    constructor(stream) {
        this.el = document.createElement('canvas');
        this.el.width = 512;
        this.el.height = 256;
        this.ctx = this.el.getContext('2d');

        this.analyser = this.__createAnalyser(stream);
    }

    update() {
        const { width, height } = this.el;

        const bufferLength = this.analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        this.analyser.getByteTimeDomainData(dataArray);

        this.ctx.fillStyle = '#202020';
        this.ctx.fillRect(0, 0, width, height);

        this.ctx.strokeStyle = 'black';
        this.ctx.beginPath();
        this.ctx.moveTo(0, Math.round(height / 2));
        this.ctx.lineTo(width, Math.round(height / 2));
        this.ctx.stroke();

        this.ctx.strokeStyle = '#FAFAFA';
        this.ctx.beginPath();
        const sliceWidth = width * 1.0 / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
            let v = dataArray[i] / 128.0;
            let y = v * height  / 2;

            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }

            x += sliceWidth;
        }

        this.ctx.lineTo(width, height / 2);
        this.ctx.stroke();
    }

    render(el) {
        el.appendChild(this.el);
    }

    remove() {
        this.el.remove();
    }
}

class UsersView {
    constructor(elId) {
        this.el = document.getElementById(elId);
        this.users = [];

        const render = () => {
            for (const user of this.users) {
                console.log('wolf');
                if (user.analyser) {
                    user.analyser.update();
                }
            }

            requestAnimationFrame(render);
        }
        render();
    }

    render(users = null) {
        this.el.innerHTML = '';

        if (!users) {
            return;
        }
        this.users = users;
        for (const user of users) {
            const li = document.createElement('li');
            const span = document.createElement('span');
            span.innerHTML = `<strong>${user.username}</strong>`;
            li.appendChild(span);
            if (user.audioEl) {
                li.appendChild(document.createElement('br'));
                li.appendChild(user.audioEl);
            }
            if (user.analyser) {
                li.appendChild(document.createElement('br'));
                user.analyser.render(li);
            }
            this.el.appendChild(li);
        }
    }
}


class MediaDeviceSelectView {
    constructor(elId, onchange, defaultDeviceId) {
        this.el = document.getElementById(elId);
        this.onchange = onchange;
        this.defaultDeviceId = defaultDeviceId;

        this.selected = false;

        this.el.addEventListener('change', () => this.onchange());
    }

    getDeviceId() {
        return this.el.value;
    }

    select(deviceId) {
        this.el.value = deviceId;
    }

    render(devices) {
        this.el.innerHTML = '';
        for (const device of devices) {
            this.el.innerHTML += `<option value=${device.deviceId}>${device.label}</option>`;
        }

        if (!this.selected && this.defaultDeviceId) {
            this.selected = true;
            this.el.value = this.defaultDeviceId;
        }
    }
}
