"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Room {
    constructor(name, uid, owner) {
        this.name = name;
        this.uid = uid;
        this.ownerId = owner.id;
        this.usersById = new Map();
    }
    addUser(user) {
        this.usersById.set(user.id, user);
    }
    removeUser(id) {
        this.usersById.delete(id);
    }
    getUsers() {
        return Array.from(this.usersById.values());
    }
    serialize() {
        const serializedUsers = [];
        for (const user of this.getUsers()) {
            serializedUsers.push(user.serialize());
        }
        return {
            uid: this.uid,
            name: this.name,
            ownerId: this.ownerId,
            users: serializedUsers
        };
    }
}
exports.default = Room;
