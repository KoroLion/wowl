import AnalyserView from './AnalyserView.js';

import { volumeUpFill, volumeMuteFill, soundwave, micMuteFill, micFill } from '../icons.js';

export class VolumeControlView {
    constructor(oninput) {
        this.el = document.createElement('div');
        this.el.classList.add('volume-control');
        this.oninput = oninput;

        this.muted = false;
        this.savedVolume = 0;

        this.volumeInput = document.createElement('input');
        this.volumeInput.type = 'range';
        this.volumeInput.value = 100;
        this.volumeInput.max = 100;

        const volumeDiv = document.createElement('div');
        volumeDiv.innerHTML = volumeUpFill;

        this.el.appendChild(volumeDiv);
        this.el.appendChild(this.volumeInput);

        this.volumeInput.addEventListener('input', (ev) => {
            const volume = this.getVolume();
            if (volume === 0) {
                volumeDiv.innerHTML = volumeMuteFill;
            } else {
                this.muted = false;
                volumeDiv.innerHTML = volumeUpFill;
            }

            this.oninput(volume);
        });

        volumeDiv.addEventListener('click', (ev) => {
            const volume = this.getVolume();
            if (volume !== 0) {
                this.savedVolume = volume;
                this.setVolume(0);
                this.muted = true;
            } else if (this.muted) {
                this.setVolume(this.savedVolume);
                this.muted = false;
            }
        });
    }

    getVolume() {
        return parseInt(this.volumeInput.value);
    }

    setVolume(volume) {
        this.volumeInput.value = volume;
        this.volumeInput.dispatchEvent(new Event('input'));
    }

    render() {
    }
}

export default class UsersView {
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
        };
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
            const memberDiv = document.createElement('div');
            memberDiv.classList.add('member');
            memberDiv.style.width = `${this.width}px`;

            const userBarDiv = document.createElement('div');
            userBarDiv.classList.add('user-bar');
            userBarDiv.innerHTML = `
                <div class="username">
                    <a href="${user.profileUrl}" target="_blank">
                        <div>
                            <img src="${user.avatarUrl}">
                        </div>
                        <div class="username">
                            ${user.username}${user.utfIcon}
                        </div>
                    </a>
                </div>
            `;

            const controlsDiv = document.createElement('div');
            controlsDiv.classList.add('controls');

            let div = document.createElement('div');
            controlsDiv.appendChild(div);

            userBarDiv.appendChild(controlsDiv);
            memberDiv.appendChild(userBarDiv);

            if (user.stream) {
                const audioEl = document.createElement('audio');
                audioEl.srcObject = user.stream;
                audioEl.style.width = `${this.width}px`;
                this.audios.push(audioEl);

                const volumeControl = new VolumeControlView((volume) => {
                    audioEl.volume = volume / 100;
                    if (volume === 0) {
                        audioEl.pause();
                    } else {
                        audioEl.play();
                    }
                });
                controlsDiv.appendChild(volumeControl.el);

                if (!user.self) {
                    audioEl.play();
                } else {
                    volumeControl.setVolume(0);
                    audioEl.volume = 0;
                }

                const analyserView = new AnalyserView(user.stream, {
                    width: this.width,
                    height: 128
                });
                this.analysers.push(analyserView);
                memberDiv.appendChild(analyserView.el);

                const analyserToggleDiv = document.createElement('div');
                analyserToggleDiv.innerHTML = soundwave;
                analyserToggleDiv.addEventListener('click', () => {
                    analyserView.el.classList.toggle('hidden');
                });
                controlsDiv.prepend(analyserToggleDiv);
            }
            this.el.appendChild(memberDiv);
        }
    }
}
