require('dotenv').config();
const AceOfTruth = require('./app/aceOfTruth');
const VkApi = require('./app/vkapi');
const { VkKbItemText, VkKbInline, VkKb, VkKbItemCallback } = require('./app/vkKeyboard');

(async() => {
    var vkApi = process.vkApi = new VkApi(process.env.VKAPI_TOKEN);
    await vkApi.init();

    vkApi.on('lp-message_new', async event => {
        var msg = event.object.message;
        var peer = msg.peer_id;
        var game = BotGame.get(peer);

        if (msg.text.includes('!стоп')) {
            if (!game || game.state == BotGame.S_OFF)
                return await vkApi.simpleMessage(peer, 'Игра не начата.');

            game.end();
            delete game;
            return;
        }

        if (msg.text.includes('!начать')) {
            if (!game)
                game = BotGame.create(peer);
            else if (game.state != BotGame.S_OFF) {
                await vkApi.simpleMessage(peer, 'Игра уже начата.');
                return;
            }
            game.begin();
            return;
        }
    });

    vkApi.on('btn-join', async event => {
        var peer = event.peer_id;
        var game = BotGame.get(peer);
        if (!game)
            return;
        if (game.state != BotGame.S_PREPARE)
            return await vkApi.simpleMessage(peer, 'Подключаться можно только во время подготовки.');

        if (game.addPlayer(event.from_id)) {
            var user = await vkApi.getUser(event.from_id);
            await vkApi.simpleMessage(peer, 'Игрок ' + user.domain + ' присоеинился к игре.');
        }
    });

    vkApi.on('btn-next', async event => {
        var peer = event.peer_id;
        var game = BotGame.get(peer);
        if (!game || game.state != BotGame.S_QUEST)
            return;
        if (game.getCurPlayer() != event.from_id)
            return await vkApi.simpleMessage(peer, 'Не ваш ход.');

        game.nextPlayer();
    });

    vkApi.on('btn-skip', async event => {
        var peer = event.peer_id;
        var game = BotGame.get(peer);
        if (!game || game.state != BotGame.S_QUEST)
            return;
        if (game.getCurPlayer() != event.from_id)
            return await vkApi.simpleMessage(peer, 'Не ваш ход.');
        game.skip();
    });

    vkApi.on('btn-stop', async event => {
        var peer = event.peer_id;
        var game = BotGame.get(peer);
        if (!game || game.state == BotGame.S_OFF)
            return await vkApi.simpleMessage(peer, 'Игра не начата.');

        game.end();
        delete game;
    });


    vkApi.on('btn-choose_quest', async event => {
        var peer = event.peer_id;
        var game = BotGame.get(peer);
        if (!game || game.state != BotGame.S_CHOOSE)
            return;
        if (game.getCurPlayer() != event.from_id)
            return await vkApi.simpleMessage(peer, 'Не ваш ход.');

        game.choose(BotGame.T_QUEST);
    });

    vkApi.on('btn-choose_action', async event => {
        var peer = event.peer_id;
        var game = BotGame.get(peer);
        if (!game || game.state != BotGame.S_CHOOSE)
            return;
        if (game.getCurPlayer() != event.from_id)
            return await vkApi.simpleMessage(peer, 'Не ваш ход.');

        game.choose(BotGame.T_ACTION);
    });

    vkApi.startLongPoll();
    console.log('LongPoll started.');
})();

class BotGame extends AceOfTruth {
    static vkApi = process.vkApi;
    peerId = null;

    static peers = {};

    static get(peerId) {
        return BotGame.peers[peerId];
    }

    static create(peerId) {
        return BotGame.peers[peerId] = new this(peerId);
    }

    constructor(peerId) {
        super();

        this.on('prepare', async t => {
            var kb = new VkKb();
            kb.addItem(VkKbItemText, 'join', 'Присоединиться').setColor('primary');

            await BotGame.vkApi.simpleMessage(peerId,
                'Начата подготовка к игре "Правда или действие" (' + t + ' сек).\
                \n\n Для участия нажмите на кнопку "Присоединиться".', [], {
                    keyboard: kb.build()
                }
            );
        });

        this.on('nextPlayer', async() => {
            var user = await BotGame.vkApi.getUser(this.getCurPlayer());
            await BotGame.vkApi.simpleMessage(peerId, 'Ход переходит к игроку @' + user.domain + '.');
        });

        this.on('sendQuest', async quest => {
            var user = await BotGame.vkApi.getUser(this.getCurPlayer());

            var kb = new VkKb();
            kb.addItem(VkKbItemText, '-', 'Ходит ' + user.domain).setColor('primary');
            kb.nextRow();
            kb.addItem(VkKbItemText, 'next', 'Передать ход').setColor('positive');
            kb.addItem(VkKbItemText, 'skip', 'След. вопрос').setColor('secondary');
            await BotGame.vkApi.simpleMessage(peerId, user.domain + ', Ваш вопрос:\n' + quest, [], {
                keyboard: kb.build(),
            });
        });

        this.on('sendAction', async action => {
            var user = await BotGame.vkApi.getUser(this.getCurPlayer());

            var kb = new VkKb();
            kb.addItem(VkKbItemText, '-', 'Ходит ' + user.domain).setColor('primary');
            kb.nextRow();
            kb.addItem(VkKbItemText, 'next', 'Передать ход').setColor('positive');
            kb.addItem(VkKbItemText, 'skip', 'След. действие').setColor('secondary');
            await BotGame.vkApi.simpleMessage(peerId, user.domain + ', Ваше действие:\n' + action, [], {
                keyboard: kb.build(),
            });
        });

        this.on('choose', async() => {
            var user = await BotGame.vkApi.getUser(this.getCurPlayer());

            var kb = new VkKb();
            kb.addItem(VkKbItemText, '-', 'Ходит ' + user.domain).setColor('primary');
            kb.nextRow();
            kb.addItem(VkKbItemText, 'choose_quest', 'Правда').setColor('positive');
            kb.addItem(VkKbItemText, 'choose_action', 'Действие').setColor('positive');

            await BotGame.vkApi.simpleMessage(peerId,
                user.domain + ', правда или действие?', [], {
                    keyboard: kb.build(),
                }
            );
        });

        this.on('end', async() => {
            await BotGame.vkApi.simpleMessage(peerId, 'Игра завершена', [], { keyboard: VkKb.EMPTY });
        });

        this.on('start', async() => {
            var usersList = '';
            var users = await BotGame.vkApi.getUsers(this.players);
            users.forEach((user, i) => {
                usersList += '\n' + (i + 1) + '. ' + user.domain;
            });
            await BotGame.vkApi.simpleMessage(peerId, 'Подготовка завершена. Игра начинается.\n\nИгроки:' + usersList);
        });

        this.on('prepareEnding', async t => {
            await BotGame.vkApi.simpleMessage(peerId, 'До конца подготовки осталось ' + t + ' сек.');
        });
    }
}