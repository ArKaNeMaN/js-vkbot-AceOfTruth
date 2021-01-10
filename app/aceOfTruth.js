const fs = require('fs');
const EventEmitter = require('events');
const rndNum = require('./rndNum');


module.exports = class AceOfTruth extends EventEmitter {
    static S_OFF = 0;
    static S_PREPARE = 1;
    static S_CHOOSE = 2;
    static S_QUEST = 3;

    static T_QUEST = 1;
    static T_ACTION = 2;


    quests = [];
    actions = [];

    players = [];
    state = AceOfTruth.S_OFF;
    t = 0;
    tInt = null;
    curPlayer = -1;
    curChoose = AceOfTruth.T_QUEST;

    constructor() {
        super();

        this.quests = JSON.parse(fs.readFileSync('./conf/quests.json'));
        this.actions = JSON.parse(fs.readFileSync('./conf/actions.json'));
    }

    begin() {
        this.state = AceOfTruth.S_PREPARE;
        this.t = process.env.GAME_PREPARE_TIME;
        this.emit('prepare', this.t);
        this.tInt = setInterval(() => {
            this.t--;
            if (this.t == 10)
                this.emit('prepareEnding', this.t);
            if (this.t <= 0) {
                clearInterval(this.tInt);
                if (this.players.length < 2)
                    this.end();
                else this.start();
            }
        }, 1000);
    }

    start() {
        this.emit('start', this.players);
        this.state = AceOfTruth.S_CHOOSE;
        setTimeout(() => { this.nextPlayer(); }, 100);
    }

    choose(type) {
        this.curChoose = type;
        this.state = AceOfTruth.S_QUEST;
        setTimeout(() => { this.skip(); }, 200);
    }

    nextPlayer() {
        this.curPlayer++;
        if (this.curPlayer >= this.players.length)
            this.curPlayer = 0;

        this.state = AceOfTruth.S_CHOOSE;
        this.emit('nextPlayer');
        setTimeout(() => { this.emit('choose'); }, 200);
    }

    skip() {
        this.getRandomQuest(this.curChoose);
    }

    getCurPlayer() {
        return this.players[this.curPlayer];
    }

    end() {
        this.emit('end');
        this.state = AceOfTruth.S_OFF;
        this.players.length = 0;
        clearInterval(this.tInt);
    }

    getRandomQuest(type) {
        switch (type) {
            case AceOfTruth.T_QUEST:
                return this.emit('sendQuest', this.quests[rndNum(this.quests.length)]);

            case AceOfTruth.T_ACTION:
                return this.emit('sendAction', this.actions[rndNum(this.actions.length)]);

            default:
                return 'Возникла некоторая ошибка :((';
        }

    }

    addPlayer(index) {
        if (this.players.find(v => { return v == index; }) !== undefined)
            return false;
        this.players.push(index);
        return true;
    }
}