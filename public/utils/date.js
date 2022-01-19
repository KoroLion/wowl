export const dateToString = function (date) {
    if (!date) {
        return ''
    }

    if (typeof(date) == 'string') {
        date = new Date(date)
    }

    const parsedDate = {
        'day': date.getDay(),
        'month': date.getMonth() + 1,
        'year': date.getYear() + 1900,

        'hour': date.getHours(),
        'minute': date.getMinutes()
    }

    for (const key in parsedDate) {
        if (key !== 'year') {
            parsedDate[key] = ('0' + parsedDate[key]).slice(-2)
        }
    }

    return `${parsedDate['day']}.${parsedDate['month']}.${parsedDate['year']} ${parsedDate['hour']}:${parsedDate['minute']}`;
}