# Translate a markdown file to nga.

import argparse
import json
import os
import re

def trans_bidel(line):
    line = re.sub(r'\*\*\*(?P<content>.+)\*\*\*',
                  '[b][i]\g<content>[/i][/b]',
                  line)
    line = re.sub(r'\*\*(?P<content>.+)\*\*',
                  '[b]\g<content>[/b]',
                  line)
    line = re.sub(r'\*(?P<content>.+)\*',
                  '[i]\g<content>[/i]',
                  line)
    line = re.sub(r'~~(?P<content>.+)~~',
                  '[del]\g<content>[/del]',
                  line)
    return line

def trans_head(line):
    global state
    r = re.match(r'^(?P<level>#+) (?P<head>.*)', line)
    if not r: return line
    if len(r.group("level")) <= state["config"]["head"]:
        line = "[h]{}[/h]".format(r.group("head"))
    elif len(r.group("level")) == state["config"]["head"] + 1:
        line = "[b]{}[/b][h][/h]".format(r.group("head"))
    else:
        line = "[b]{}[/b]".format(r.group("head"))
    return line + "\n"

def trans_image(line):
    return re.sub(r'!\[(?P<content>.*)\]\((?P<url>[-a-zA-Z0-9@:%_\+.~#?&//=]{2,256}\.[a-z]{2,4}\b(\/[-a-zA-Z0-9@:%_\+.~#?&//=]*)?)\)',
                  '[img]\g<url>[/img]',
                  line)

def trans_url(line):
    return re.sub(r'\[(?P<content>.*)\]\((?P<url>[-a-zA-Z0-9@:%_\+.~#?&//=]{2,256}\.[a-z]{2,4}\b(\/[-a-zA-Z0-9@:%_\+.~#?&//=]*)?)\)',
                  '[url=\g<url>]\g<content>[/url]',
                  line)

def handle_eof():
    global state
    new_line = ""
    while state["level"]["list"][-1] > 0:
        new_line += " " * (state["level"]["list"][-1] - 2)
        new_line += '[/list]\n'
        state["level"]["list"] = state["level"]["list"][:-1]
        state["regex"]["list"] = state["regex"]["list"][:-1]
    return new_line

def trans_list(line):
    global state
    p = r'^(?P<level>(\s+)?)[-+*]'
    r = re.match(p, line)
    if not line.strip(): return line
    if not r:
        if state["level"]["list"][-1] == 0: return line
        new_line = handle_eof()
        return new_line + line
    list_level = len(r.group("level")) + 2  # add 2 cuz 0 for no list
    new_line = " " * state["level"]["list"][-1] # start offset
    if list_level > state["level"]["list"][-1]: # new list start
        state["level"]["list"].append(list_level)
        state["regex"]["list"].append(r)
        new_line += "[list]" + re.sub(p, '[*]', line, 1)
    elif list_level == state["level"]["list"][-1]:  # list same level
        new_line += re.sub(p, '[*]', line, 1)
    else:   # list back level
        while state["level"]["list"][-1] > list_level:
            new_line = "{}[/list]\n".format(" " * (state["level"]["list"][-1] - 2)) # end offset
            state["level"]["list"] = state["level"]["list"][:-1]
            state["regex"]["list"] = state["regex"]["list"][:-1]
        new_line += (" " * state["level"]["list"][-1]) + re.sub(p, '[*]', line, 1)
    return new_line



def parse_translations(lines):
    trans = []
    for line in lines:
        line = trans_bidel(line)
        line = trans_head(line)
        line = trans_image(line)
        line = trans_url(line)
        line = trans_list(line)
        trans.append(line)
    trans.append(handle_eof())
    return trans

def main(args):
    filename = args.input
    if not os.path.exists(filename):
        raise FileNotFoundError(f'Could not find file "{filename}"')

    with open(filename, 'r', encoding='utf-8') as fp:
        lines = fp.readlines()

    trans = parse_translations(lines)

    if args.output:
        with open(args.output, 'w', encoding='utf-8') as fp:
            fp.write(''.join(trans))
    else:
        for line in trans:
            print(line)

if __name__ == "__main__":
    state = {
        "config":{
            "head": 1,
        },
        "level": {
            "list": [0],
        },
        "regex": {
            "list": [None],
        }
    }
    example_usage = ""

    parser = argparse.ArgumentParser(
        description="Translate a markdown file to nga",
        epilog=example_usage,
        formatter_class=argparse.RawDescriptionHelpFormatter)

    parser.add_argument('-i', '--input', help="The markdown file name, e.g. README.md")
    parser.add_argument('-o', '--output', help="If passed, output the nga code to a file, e.g. README.nga")
    parser.add_argument('-hl', '--headlevel', type=int, help="If passed, overwrite the default head level, e.g. 2")

    args = parser.parse_args()

    if not args.input:
        raise parser.error('Must pass an input markdown file.')
    if args.headlevel:
        state["config"]["head"] = args.headlevel

    main(args)
