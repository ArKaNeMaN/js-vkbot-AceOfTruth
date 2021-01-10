class VkKb {
    static EMPTY = JSON.stringify({ "buttons": [], "one_time": true });

    MAX_COLS = 4;
    MAX_ROWS = 10;

    buttons = [];
    inline = false;
    oneTime = false;

    constructor() {
        this.nextRow();
    }

    build() {
        var k = {
            one_time: this.oneTime,
            inline: this.inline,
            buttons: [],
        };
        this.buttons.forEach(row => {
            var buildedRow = [];
            row.forEach(item => {
                buildedRow.push(item.build());
            });
            k.buttons.push(buildedRow);
        });
        return k;
    }

    addItem(cItem, ...params) {
        var row = this.buttons.length - 1;
        if (this.buttons[row].length >= this.MAX_COLS)
            return null;

        var item = new cItem(...params);
        if (!item)
            return null;

        this.buttons[row].push(item);
        return item;
    }

    nextRow() {
        var row = this.buttons.length - 1;
        if (row >= this.MAX_ROWS)
            return false;
        this.buttons.push([]);
    }
}

class VkKbInline extends VkKb {
    MAX_COLS = 3;
    MAX_ROWS = 3;

    inline = true;
    oneTime = false;
}

class VkKbItem {
    static COLORS = ['primary', 'secondary', 'negative', 'positive'];

    color = 'primary';
    index = null;

    type = null;
    payload = {};

    constructor(index) {
        this.index = index;
    }

    build() {
        return {
            color: this.color,
            action: {
                type: this.type,
                payload: JSON.stringify({
                    ...this.payload,
                    _index: this.index
                }),
            }
        }
    }

    setColor(color) {
        if (!VkKbItem.COLORS.includes(color))
            return;
        this.color = color;
        return this;
    }


    setPayload(key, value) {
        this.payload[key] = value;
        return this;
    }
}

class VkKbItemLocation extends VkKbItem {
    type = 'location';
}

class VkKbItemLabeled extends VkKbItem {
    label = '';

    constructor(index, label) {
        super(index);
        this.label = label;
    }

    build() {
        var item = super.build();
        item.action.label = this.label;
        return item;
    }

}

class VkKbItemText extends VkKbItemLabeled {
    type = 'text';
}

class VkKbItemCallback extends VkKbItemLabeled {
    type = 'callback';
}

class VkKbItemLink extends VkKbItemLabeled {
    type = 'open_link';
    link = '';

    constructor(index, label, link) {
        super(index, label);
        this.link = link;
    }
}

module.exports = {
    VkKb,
    VkKbInline,
    VkKbItem,
    VkKbItemLocation,
    VkKbItemLabeled,
    VkKbItemText,
    VkKbItemCallback,
    VkKbItemLink,
};