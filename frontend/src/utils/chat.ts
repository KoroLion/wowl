import { dateToString } from "./date.js";
import { scrollToBottom } from "./common.js";

const MAX_MESSAGES = 100

export const Message = class {
    username: string
    avatarUrl: string
    datetime: Date
    content: string

    constructor(username: string, avatarUrl: string, datetime: Date, content: string) {
        this.username = username
        this.avatarUrl = avatarUrl
        this.datetime = datetime
        this.content = content
    }
}

export const createMessageEl = function (message) {
    const template = new DOMParser().parseFromString(`<div class="message">
                <div class="avatar">
                    <img alt="">
                </div>
                <div class="body">
                    <div class="title">
                        <a href="#" class="username" target="_blank"></a>
                        <span class="datetime">${dateToString(message.datetime)}</span>
                    </div>
                    <div class="content"></div>
                </div>
            </div>`, 'text/html')

    template.querySelector('img').src = message.avatarUrl

    const usernameLink = template.querySelector('a.username') as HTMLLinkElement
    usernameLink.textContent = message.username
    usernameLink.href = `https://liokor.com/@${message.username}`

    template.querySelector('div.content').textContent = message.content

    return template.body.firstChild
}

function getLastMessages() {
    const lastMessages = JSON.parse(localStorage.getItem('lastMessages'))
    if (!lastMessages) {
        return []
    }
    return lastMessages
}

export const addMessage = function (div, msg) {
    const message = new Message(msg['username'], msg['avatarUrl'], msg['datetime'], msg['content'])

    let lastMessages = getLastMessages()
    lastMessages.push(msg)
    if (lastMessages.length > MAX_MESSAGES) {
        const diff = lastMessages.length - MAX_MESSAGES
        lastMessages = lastMessages.slice(diff, lastMessages.length)
    }
    localStorage.setItem('lastMessages', JSON.stringify(lastMessages))

    const messageEl = createMessageEl(message)
    div.appendChild(messageEl)
    scrollToBottom(div)
}

export const loadMessages = function (div) {
    const lastMessages = getLastMessages()
    for (const message of lastMessages) {
        const msgEl = createMessageEl(message)
        div.appendChild(msgEl)
    }
    scrollToBottom(div)
}
