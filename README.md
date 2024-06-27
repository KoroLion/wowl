# WOWL

Simple WebRTC voice/video/text chat. 

This repository is for both frontend and backend.

## Tech requirements:
* NodeJS 20.14+
* yarn 1.22.19+

## How to develop:
1. `yarn`
2. `cp config.template.json config.js`
3. In one terminal: `yarn watch`
4. In another terminal: `yarn dev`
5. Navigate to `http://localhost:8081` in browser

## How to build & deploy:
1. `yarn`
2. `yarn build`
3. `cp config.template.json config.js`
4. Edit `config.js` according to your needs
5. Target static web server to `src/frontend`
6. Launch backend: `node src/backend/app.js`
