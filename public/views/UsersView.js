import AnalyserView from './AnalyserView.js';

import { volumeUpFill, volumeMuteFill, soundwave, micMuteFill, micFill } from '../icons.js';

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
            const volumeInput = document.createElement('input');
            volumeInput.type = 'range';
            volumeInput.value = 100;
            volumeInput.max = 100;

            let div = document.createElement('div');
            div.appendChild(volumeInput);
            controlsDiv.appendChild(div);

            const volumeDiv = document.createElement('div');
            volumeDiv.innerHTML = volumeUpFill;
            controlsDiv.prepend(volumeDiv);
            volumeDiv.addEventListener('click', () => {
                volumeInput.value = 0;
            });

            userBarDiv.appendChild(controlsDiv);
            memberDiv.appendChild(userBarDiv);

            if (user.stream) {
                const audioEl = document.createElement('audio');
                volumeInput.addEventListener('input', (ev) => {
                    const volume = parseInt(ev.target.value);
                    audioEl.volume = volume / 100;
                    if (volume === 0) {
                        audioEl.pause();
                        volumeDiv.innerHTML = volumeMuteFill;
                    } else {
                        audioEl.play();
                        volumeDiv.innerHTML = volumeUpFill;
                    }
                });
                audioEl.srcObject = user.stream;
                audioEl.style.width = `${this.width}px`;
                if (!user.self) {
                    audioEl.play();
                }
                this.audios.push(audioEl);
                memberDiv.appendChild(audioEl);

                const analyserView = new AnalyserView(user.stream, {
                    width: this.width,
                    height: 128
                });
                this.analysers.push(analyserView);
                memberDiv.appendChild(analyserView.el);
            }
            this.el.appendChild(memberDiv);
        }
    }
}
