export default class OnlineUsersView {
    constructor(elId) {
        this.el = document.getElementById(elId);
    }

    clear() {
        this.el.innerHTML = "<h2>Users online:</h2>"
    }

    render(users) {
        this.clear()
        for (const user of users) {
            this.el.innerHTML += `<div class="user">
                <div class="avatar"><img src="${user.avatarUrl}"></div>
                <div class="username"><a href="https://liokor.com/@${user.username}">${user.username}${user.utfIcon}</a></div>
            </div>`;
        }
    }
}
