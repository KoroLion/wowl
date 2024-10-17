export default class OnlineUsersView {
    constructor(el, renderTitle = true) {
        this.el = el;
        this.renderTitle = renderTitle;
    }
    clear() {
        if (this.renderTitle) {
            this.el.innerHTML = "<h2>Users online:</h2>";
        }
        else {
            this.el.innerHTML = "";
        }
    }
    render(users) {
        this.clear();
        for (const user of users) {
            this.el.innerHTML += `<div class="user">
                <div class="avatar"><img src="${user.avatarUrl}"></div>
                <div class="username"><a href="https://liokor.com/@${user.username}" target="_blank">${user.username}${user.utfIcon}</a></div>
            </div>`;
        }
    }
}
