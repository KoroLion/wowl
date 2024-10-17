import User from './User.js';

export default class Room {
    uid: string
    name: string
    users: User[]

    constructor(uid: string, name: string, users: User[]) {
        this.uid = uid
        this.name = name
        this.users = users
    }
}
