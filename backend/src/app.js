"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const config_schema_1 = require("./schemas/config_schema");
const server_1 = require("./services/server");
class App {
    constructor() {
        this.__CONFIG_PATH = "./config.json";
    }
    start() {
        return __awaiter(this, void 0, void 0, function* () {
            const config = yield this.__getConfig();
            const server = new server_1.default(config);
            server.listen();
        });
    }
    __getConfig() {
        return __awaiter(this, void 0, void 0, function* () {
            console.info(`Reading config from ${this.__CONFIG_PATH}...`);
            const data = fs.readFileSync(this.__CONFIG_PATH).toString();
            return yield config_schema_1.configSchema.validate(JSON.parse(data));
        });
    }
}
const app = new App();
app.start();
