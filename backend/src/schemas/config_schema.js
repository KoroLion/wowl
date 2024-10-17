"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.configSchema = exports.iceServerSchema = void 0;
const yup = require("yup");
exports.iceServerSchema = yup.object({
    urls: yup.string().required(),
    username: yup.string().required(),
    credential: yup.string().required(),
});
exports.configSchema = yup.object({
    debug: yup.boolean().required(),
    port: yup.number().required(),
    authUrl: yup.string().required(),
    jwtKey: yup.string().required(),
    iceServers: yup.array().of(exports.iceServerSchema).required()
});
