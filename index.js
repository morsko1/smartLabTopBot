const TelegramBot = require('node-telegram-bot-api');
const request = require('request');
const cheerio = require('cheerio');

// token kept in token.js hidden by .gitignore
// token.js should be like following:
// module.exports = 'yourTelegramBotToken';
const token = require('./token');
const bot = new TelegramBot(token, {
    polling: {
        params: {
            interval: 2000
        }
    }
});

bot.onText(/\/start/i, (msg, match) => {
    const opts = {
    reply_markup: JSON.stringify({
        keyboard: [
            ['день'],
            ['неделя'],
            ['месяц']
        ]
    })
    };
    bot.sendMessage(
        msg.chat.id,
        'Привет! Этот бот выводит топ публикаций smart-lab за указанный период (день, неделя, месяц)',
        opts
    );
});

const blockedAuthors = [
    'Krechetov',
];
const blockedLabels = [
    'ситуация на текущий момент',
];

bot.onText(/день|неделя|месяц/i, (msg, match) => {
    const chatId = msg.chat.id;
    const input = msg.text.trim();
    let urlTail = '';
    let messageTitle = '';
    switch (input) {
        case 'день': {
            urlTail = '24h';
            messageTitle = '24 часа';
            break;
        }
        case 'неделя': {
            urlTail = '7d';
            messageTitle = '7 дней';
            break;
        }
        case 'месяц': {
            urlTail = '30d';
            messageTitle = '30 дней';
            break;
        }
        default: {}
    }

    const opts = {
        parse_mode: 'HTML'
    };

    let message = `smart-lab топ ${messageTitle}:\n\n`;

    request({
      uri: `https://smart-lab.ru/top/topic/${urlTail}/`,
    }, (error, response, body) => {
        const $ = cheerio.load(body);
        $('.topic').each((i, v) => {
            if(i === 0) return;
            const value = $(v);
            const topic = cheerio.load(value.html());
            const label = topic('.title a').text();
            if (blockedLabels.indexOf(label.toLowerCase()) !== -1) {
                return;
            }
            const author = topic('.author a.trader_other').text();
            if (blockedAuthors.indexOf(author) !== -1) {
                return;
            }
            const href = topic('.title a').attr('href');
            const likes = topic('.voting .total a').text();
            const content = topic('.content').text().slice(0, 140) + '...';
            const link = `👍 ${likes}: <a href='smart-lab.ru${href}'>${label}</a>\n<i>(${author})</i>\n${content.trim()}\n\n`;
            message += link;
        })

        bot.sendMessage(chatId, message, opts);
    });
});
