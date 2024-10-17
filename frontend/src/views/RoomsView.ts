import OnlineUsersView from "./OnlineUsersView.js"


export default class RoomsView {
    el: HTMLElement
    joinRoomCallback: (uid: string) => void
    deleteRoomCallback: (uid: string) => void
    kickUserCallback: (id: number) => void

    constructor(el: HTMLElement, joinRoomCallback: (uid: string) => void, deleteRoomCallback: (uid: string) => void, kickUserCallback: (id: number) => void) {
        this.el = el
        this.joinRoomCallback = joinRoomCallback
        this.kickUserCallback = kickUserCallback
        this.deleteRoomCallback = deleteRoomCallback
    }

    clear() {
        this.el.innerHTML = "<h2>Voice rooms:</h2>"
    }

    render(rooms) {
        this.clear();

        for (const room of rooms) {
            const usersEl = document.createElement("div");
            const onlineUsersView = new OnlineUsersView(usersEl, false);

            onlineUsersView.render(room.users)

            const roomTitleH3 = document.createElement("h3");
            roomTitleH3.classList.add("room-name")
            roomTitleH3.textContent = room.name

            const membersDiv = document.createElement("div");
            membersDiv.classList.add("members")
            membersDiv.appendChild(usersEl)

            const roomDiv = document.createElement("div");
            roomDiv.classList.add("room");
            roomDiv.appendChild(roomTitleH3)
            roomDiv.appendChild(membersDiv)

            roomDiv.addEventListener("click", () => {
                console.log(room.id)
                this.joinRoomCallback(room.uid)
            })

            this.el.appendChild(roomDiv);
        }
    }
}
