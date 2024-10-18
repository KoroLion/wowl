export default class MediaDeviceSelectView {
    el: HTMLInputElement
    onchange: () => void
    defaultDeviceId: string
    selected: boolean

    constructor(el: HTMLInputElement, onchange: () => void, defaultDeviceId: string) {
        this.el = el;
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
