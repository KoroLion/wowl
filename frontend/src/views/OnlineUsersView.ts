import User from "../models/User.js"

export default class OnlineUsersView {
    el: HTMLElement
    renderTitle: boolean

    constructor(el: HTMLElement, renderTitle: boolean = true) {
        this.el = el;
        this.renderTitle = renderTitle;
    }

    clear(): void {
        if (this.renderTitle) {
            this.el.innerHTML = "<h2>Users online:</h2>"
        } else {
            this.el.innerHTML = ""
        }
    }

    render(users: User[]): void {
        this.clear()
        for (const user of users) {
            this.el.innerHTML += `<div class="user">
                <div class="avatar"><img src="${user.avatarUrl}"></div>
                <div class="username"><a href="https://liokor.com/@${user.username}" target="_blank">${user.username}${user.utfIcon}</a></div>
            </div>`;
        }
    }
}
