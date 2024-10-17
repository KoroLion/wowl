import App from './classes/App.js';

async function main() {
    try {
        const app = new App();
        await app.init();
        await app.connect();

        window.addEventListener('beforeunload', () => {
            app.close();
        });
    } catch (e) {
        console.log(e);
    }
}

window.addEventListener('load', main);
