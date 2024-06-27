import fs = require("fs")

import { Config, configSchema } from "./schemas/config_schema"
import Server from "./services/server"


class App {
    __CONFIG_PATH = "./config.json"

    async start(): Promise<void> {
        const config = await this.__getConfig()
        const server = new Server(config)
        server.listen()
    }

    async __getConfig(): Promise<Config> {
        console.info(`Reading config from ${this.__CONFIG_PATH}...`)
        const data = fs.readFileSync(this.__CONFIG_PATH).toString()
        return await configSchema.validate(JSON.parse(data))
    }
}

const app = new App()
app.start()
