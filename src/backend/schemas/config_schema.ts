import * as yup from "yup"


export const iceServerSchema = yup.object({
    urls: yup.string().required(),
    username: yup.string().required(),
    credential: yup.string().required(),
})


export const configSchema = yup.object({
    debug: yup.boolean().required(),
    port: yup.number().required(),
    authUrl: yup.string().required(),
    jwtKey: yup.string().required(),
    iceServers: yup.array().of(iceServerSchema).required()
})

export interface Config extends yup.InferType<typeof configSchema> {
}
