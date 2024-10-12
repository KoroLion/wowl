import crypto = require("crypto")

import User from "../models/user";

export default class Room {
    uid: crypto.UUID
    name: string
    ownerId: number
    usersById: Map<number, User>

    constructor(uid: crypto.UUID, owner: User) {
        this.uid = uid;
        this.ownerId = owner.id;
        this.usersById = new Map();
        this.usersById.set(owner.id, owner)
    }

    addUser(user: User): void {
        this.usersById.set(user.id, user)
    }

    removeUser(id: number) {
        this.usersById.delete(id)
    }

    getUsers(): User[] {
        return Array.from(this.usersById.values())
    }

    serialize(): object {
        const serializedUsers: object[] = [];
        for (const user of this.getUsers()) {
            serializedUsers.push(user.serialize())
        }

        return {
            uid: this.uid,
            ownerId: this.ownerId,
            users: serializedUsers
        }
    }
}
