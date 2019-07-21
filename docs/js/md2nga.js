"use strict";
let state = {};

function trans_bidel(line){
    line = line.replace(/\*\*\*(.+?)\*\*\*/g, "[b][i]$1[/i][/b]");
    line = line.replace(/\*\*(.+?)\*\*/g, "[b]$1[/b]");
    line = line.replace(/\*(.+?)\*/g, "[i]$1[/i]");
    line = line.replace(/~~(.+?)~~/g, "[del]$1[/del]");
    return line;
}

function trans_head(line){
    let p = /^(#+) (.*)/;
    let r = line.match(p);
    if(!r) return line;
    if (r[1].length <= state["config"]["head"])
        line = "[h]" + r[2] + "[/h]";
    else if (r[1].length == state["config"]["head"] + 1)
        line = "[b]" + r[2] + "[/b][h][/h]";
    else
        line = "[b]" + r[2] + "[/b]";
    return line;
}

function trans_image(line){
    return line.replace(/!\[(?:.*?)\]\(([-a-zA-Z0-9@:%_\+.~#?&//=]{2,256}\.[a-z]{2,4}\b(\/[-a-zA-Z0-9@:%_\+.~#?&//=]*)?)\)/g, '[img]$1[/img]');
}

function trans_url(line){
    return line.replace(/\[(.*?)\]\(([-a-zA-Z0-9@:%_\+.~#?&//=]{2,256}\.[a-z]{2,4}\b(\/[-a-zA-Z0-9@:%_\+.~#?&//=]*)?)\)/g, '[url=$2]$1[/url]');
}

function trans_code(line){
    let p = /\s*?```((\w*)?)/;
    let r = line.match(p);
    if (r){
        if(state["code"] == "on"){
            line = line.replace(/```((\w*)?)/, "[/code]");
            state["code"] = "to_turn_off";
        }else{
            line = line.replace(/```((\w*)?)/, "[code=$1]");
            state["code"] = "on";
        }
    }
    return line;
}

function handle_eof(){
    let new_line = ""
    while(state["level"]["list"][state["level"]["list"].length-1] > 0){
        state["level"]["list"].pop();
        new_line += " ".repeat(Math.max(state["level"]["list"][state["level"]["list"].length-1], 0));
        new_line += '[/list]\n';
    }
    return new_line
}

function trans_list(line){
    let p = /^((\s+)?)\d+\./;
    if (p.test(line))
        line = line.replace(/\d+\./, '-');
    p = /^((\s+)?)[-+*]/;    // $1: level
    let r = line.match(p);
    if (!line.trim()) return line;
    if (!r){
        if(state["level"]["list"][state["level"]["list"].length-1] == 0) return line;
        return handle_eof() + line;
    }
    let list_level = r[1].length + 6;  // add 2 cuz 0 for no list
    let len = state["level"]["list"].length;
    let new_line = " ".repeat(state["level"]["list"][len-1]) // start offset
    if (list_level > state["level"]["list"][len-1]){ // new list start
        state["level"]["list"].push(list_level);
        new_line += "[list]" + line.replace(p, '[*]');
    }else if (list_level == state["level"]["list"][-1]){ //list same level
        new_line += line.replace(p, '[*]');
    }else{   // list back level
        new_line = ""
        while (state["level"]["list"][state["level"]["list"].length-1] > list_level){
            state["level"]["list"].pop();
            new_line += " ".repeat(Math.max(state["level"]["list"][state["level"]["list"].length-1], 0)) + "[/list]\n"; // end offset
        }
        new_line += (" ".repeat(state["level"]["list"][state["level"]["list"].length-1])) + line.replace(p, '[*]');
    }
    return new_line
}

function trans_table(lines) {
    let result = "";
    const origin = lines;
    const length = origin.length;
    for (let i = 0; i < length; i++) {
        if (i + 1 < length &&
            origin[i].startsWith("|") && origin[i].endsWith("|") &&
            origin[i + 1].startsWith("|") && origin[i + 1].endsWith("|") && !/[^\s\|\-\:]/.test(origin[i + 1]) &&
            origin[i + 1].match(/(?<!\\)\|/g).length === origin[i].match(/(?<!\\)\|/g).length) {
            let tablecode = origin[i] + "\n" + origin[i + 1];
            i++;
            for (let j = i + 1; j < length; j++) {
                if (origin[j].startsWith("|") && origin[j].endsWith("|")) {
                    tablecode += "\n" + origin[j];
                    i = j;
                } else {
                    break;
                }
            }
            result += "\n" + trans_table_gen(tablecode);
        } else {
            result += "\n" + origin[i];
        }
    }
    return result.trim().split("\n");
}

function trans_table_gen(tablecode) {
    let trh,
        trd = [];
    const align = [];
    const tablecodelines = tablecode.split(/\n/);
    const delimiterrow = tablecodelines.splice(1, 1);
    delimiterrow[0].substring(1, delimiterrow[0].length - 1).split(/(?<!\\)\|/).map((str) => str.trim()).forEach((delimiter) => {
        let alignside = null;
        if (delimiter.startsWith(":")) {
            alignside = "left";
        }
        if (delimiter.endsWith(":")) {
            if (alignside === "left") {
                alignside = "center";
            } else {
                alignside = "right";
            }
        }
        align.push(alignside);
    });
    tablecodelines.forEach((code, index) => {
        const split = code.substring(1, code.length - 1).split(/(?<!\\)\|/).map((str) => str.trim());
        split.splice(align.length);
        while (split.length < align.length) {
            split.push("");
        }
        if (index === 0) {
            trh = split.map((s, i) => {
                let base = s;
                if (align[i] !== null) {
                    base = `[align=${align[i]}]${s}[/align]`;
                }
                return `[td][b]${base}[/b][/td]`;
            }).join("");
        } else {
            trd.push(split.map((s, i) => {
                let base = s;
                if (align[i] !== null) {
                    base = `[align=${align[i]}]${s}[/align]`;
                }
                return `[td]${base}[/td]`;
            }).join(""));
        }
    });
    return `[table]\n[tr]${trh}[/tr]\n[tr]${trd.join("[/tr]\n[tr]")}[/tr]\n[/table]`;
}
function md2nga(text) {
    let lines = text.split("\n");
    let table_lines = trans_table(lines);
    let trans = Array();
    state = {
        "config":{
            "head": 1,
        },
        "level": {
            "list": [0],
        },
        "code": "off"
    };
    for(let idx in table_lines){
        let line = table_lines[idx];
        line = trans_code(line)
        if (state["code"] == "off"){
            line = trans_bidel(line);
            line = trans_head(line);
            line = trans_image(line);
            line = trans_url(line);
            line = trans_list(line)
        }
        trans.push(line)
        if(state["code"] == "to_turn_off"){
            state["code"] = "off";
        }
    }
    trans.push(handle_eof());
    return trans.join("\n");
}
