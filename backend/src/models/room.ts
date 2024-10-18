import * as crypto from "crypto"

import User from "./user";

export default class Room {
    uid: crypto.UUID
    name: string
    ownerId: number
    ownerUid: number | null
    usersById: Map<number, User>

    constructor(name: string, uid: crypto.UUID, owner: User) {
        this.name = name
        this.uid = uid;
        this.ownerId = owner.id;
        this.ownerUid = owner.uid;
        this.usersById = new Map();
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

    hasUser(userId: number): boolean {
        return this.usersById.has(userId)
    }

    serialize(): object {
        const serializedUsers: object[] = [];
        for (const user of this.getUsers()) {
            serializedUsers.push(user.serialize())
        }

        return {
            uid: this.uid,
            name: this.name,
            ownerId: this.ownerId,
            ownerUid: this.ownerUid,
            users: serializedUsers
        }
    }
}
