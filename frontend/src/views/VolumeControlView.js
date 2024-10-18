import { volumeUpFill, volumeMuteFill } from '../utils/icons.js';
export default class VolumeControlView {
    constructor(oninput) {
        this.el = document.createElement('div');
        this.el.classList.add('volume-control');
        this.oninput = oninput;
        this.muted = false;
        this.savedVolume = 0;
        this.volumeInput = document.createElement('input');
        this.volumeInput.type = 'range';
        this.volumeInput.value = "100";
        this.volumeInput.max = "100";
        const volumeDiv = document.createElement('div');
        volumeDiv.innerHTML = volumeUpFill;
        this.el.appendChild(volumeDiv);
        this.el.appendChild(this.volumeInput);
        this.volumeInput.addEventListener('input', (ev) => {
            const volume = this.getVolume();
            if (volume === 0) {
                volumeDiv.innerHTML = volumeMuteFill;
            }
            else {
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
            }
            else if (this.muted) {
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
