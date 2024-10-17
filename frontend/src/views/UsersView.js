import AnalyserView from './AnalyserView.js';
import VolumeControlView from './VolumeControlView.js';
import { soundwave } from '../icons.js';
export default class UsersView {
    constructor(el) {
        this.el = el;
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
            user.memberDiv = memberDiv;
            memberDiv.classList.add('member');
            memberDiv.style.width = `${this.width}px`;
            const userBarDiv = document.createElement('div');
            userBarDiv.classList.add('user-bar');
            userBarDiv.innerHTML = `
                <div class="username">
                    <a href="${user.profileUrl}" target="_blank">
                        <div class="avatar">
                            <div class="circle"></div>
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
            const div = document.createElement('div');
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
                    }
                    else {
                        audioEl.play();
                    }
                });
                controlsDiv.appendChild(volumeControl.el);
                if (!user.self) {
                    audioEl.play();
                }
                else {
                    volumeControl.setVolume(0);
                    audioEl.volume = 0;
                }
                const analyserView = new AnalyserView(user.stream, {
                    width: this.width,
                    height: 128
                }, user);
                this.analysers.push(analyserView);
                const analyserDiv = document.createElement('div');
                analyserDiv.classList.add('analyser');
                analyserDiv.appendChild(analyserView.el);
                memberDiv.appendChild(analyserDiv);
                const analyserToggleDiv = document.createElement('div');
                analyserToggleDiv.innerHTML = soundwave;
                analyserToggleDiv.addEventListener('click', () => {
                    analyserDiv.classList.toggle('hidden');
                });
                controlsDiv.prepend(analyserToggleDiv);
            }
            this.el.appendChild(memberDiv);
        }
    }
}
