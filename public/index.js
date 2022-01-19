import App from './classes/App.js';

import { loadMessages } from './utils/chat.js'

async function main() {
    loadMessages(messagesDiv)

    try {
        const app = new App();
        await app.init();
        await app.connect();

        if (app.debug) {
            await app.join();
        }

        window.addEventListener('beforeunload', (e) => {
            app.close();
        });

        muteBtn.addEventListener('click', () => {
            app.mute(!app.muted);
        });
        wolcharnia.addEventListener('click', async () => {
            await app.join();
        });
        disconnectBtn.addEventListener('click', () => {
            app.leave();
        });
        statsBtn.addEventListener('click', async () => {
            await app.infoToConsole();
        });
        messageTextarea.addEventListener('keypress', (ev) => {
            if (ev.ctrlKey && ev.key === 'Enter') {
                app.sendMessage();
            }
        });
    } catch (e) {
        console.log(e);
    }
}

window.addEventListener('load', main);
