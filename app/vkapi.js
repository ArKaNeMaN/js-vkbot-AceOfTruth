const axios = require('axios').default;
const EventEmitter = require('events');
const rndNum = require('./rndNum');

module.exports = class VkApi extends EventEmitter {
    lpServer = null;
    groupData = null;

    vkUrl = 'https://api.vk.com/method/';
    apiVer = '5.126';
    accessToken = null;

    constructor(token) {
        super();

        this.accessToken = token;
        this.on('lp-message_new', event => {
            //console.log(event);
            var msg = event.object.message;
            if (!msg.payload)
                return;
            msg.payload = JSON.parse(msg.payload);
            if (msg.payload._index)
                this.emit('btn-' + msg.payload._index, msg);
        });
    }

    async init() {
        var res = await this.call('groups.getById');
        this.groupData = res[0];
    }

    async getUser(user_id) {
        var res = await this.call('users.get', { user_ids: user_id, fields: 'domain' });
        return res[0];
    }

    async getUsers(user_ids) {
        var res = await this.call('users.get', { user_ids: user_ids.join(','), fields: 'domain' });
        return res;
    }

    startLongPoll() {
        this.call('groups.getLongPollServer', { group_id: this.groupData.id }).then(res => {
            this.lpServer = res;
            this.sendLongPoll();
        }).catch(reason => {
            console.log(reason);
        });
    }

    sendLongPoll() {
        axios.get(this.lpServer.server, {
            params: {
                act: 'a_check',
                key: this.lpServer.key,
                ts: this.lpServer.ts,
                wait: 25,
            }
        }).then(res => {
            res = res.data;
            this.lpServer.ts = res.ts;
            if (res.updates)
                for (var i = 0; i < res.updates.length; i++)
                    this.emit('lp-' + res.updates[i].type, res.updates[i]);
            this.sendLongPoll();
        }).catch(reason => {
            console.log(reason);
            this.startLongPoll();
        });
    }

    async getGroupData(group_id = null) {
        return (await this.call('groups.getById', { group_id }))[0];
    }

    async simpleMessage(peerId, message, attachments = [], other = {}) {
        var params = {
            message,
            attachments: attachments.join(','),
            ...other,
            random_id: rndNum(9999999999),
        };

        if (typeof peerId == 'number')
            params.peer_id = peerId;
        else if (typeof peerId == 'string')
            params.domain = peerId;
        else if (peerId instanceof Array)
            params.peer_ids = peerId.join(',');
        else return 0;

        return await this.call('messages.send', params);
    }

    call(method, params = {}) {
        return new Promise(async(resolve, reject) => {
            if (!this.accessToken) {
                console.error('Token is empty');
                return;
            }

            try {
                var res = await axios.get(this.vkUrl + method, {
                    params: {
                        v: this.apiVer,
                        access_token: this.accessToken,
                        ...params,
                    }
                });
            } catch (error) {
                reject(res.error);
            }

            res = res.data;
            if (res.error) {
                reject(res.error);
            } else resolve(res.response);
        }).catch(reason => {
            console.log(reason);
        });
    }
}