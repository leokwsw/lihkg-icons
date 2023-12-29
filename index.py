import os
import re
import json
import time

import demjson3
import requests
from bs4 import BeautifulSoup

DOWNLOAD_INTERVAL = 1

def search_bracket(text: str):
    depth = 0
    is_str = False

    for count, char in enumerate(text):
        if char == '"':
            is_str = not is_str
        
        if is_str == False:
            if char == '{':
                depth += 1
            elif char == '}':
                depth -= 1
        
        if depth == 0:
            return count

def gif2png(path: str) -> str:
    return path.replace('.gif', '.png').replace('faces', 'faces_png')

def get_main_js_url() -> str:
    page = requests.get('https://lihkg.com')
    soup = BeautifulSoup(page.text, 'html.parser')
    main_js_url = soup.find(src=re.compile('main.js')).get('src')
    return main_js_url

def parse_main_js(main_js_url: str) -> dict:
    r = requests.get(main_js_url).text

    # Find start
    start_pos = r.find('assets/faces/normal')
    r = r[start_pos-30:]
    start_pos = r.find('{normal:{icons:{"')
    r = r[start_pos:]

    # Find end
    end_pos = search_bracket(r)
    r = r[:end_pos+1]

    # ! symbol affects parsing
    r = r.replace('!0', '1')

    # Parse
    data = demjson3.decode(r)

    return data

def download(path: str, fmt: str = 'gif') -> str:
    base_url = 'https://cdn.lihkg.com/'

    url = base_url + path
    if fmt == 'png':
        url = gif2png(url)
    
    if os.path.isfile(path):
        return 'exists'

    r = requests.get(url)
    if not r.ok:
        return 'download failed'
    
    time.sleep(DOWNLOAD_INTERVAL)

    with open(path, 'wb+') as f:
        f.write(r.content)

    return 'downloaded'

def download_all(data: dict, fmt: str = 'gif'):
    for pack, v in data.items():
        for path, emoji in v.get('icons', {}).items():
            status = download(path, fmt)
            print(path, status)
        
        for path, emoji in v.get('special', {}).items():
            status = download(path, fmt)
            print(path, status)

def update_readme(data: dict, mapping: dict):
    with open('README_TEMPLATE') as f:
        readme = f.read()

    body = '| Code | Name | Preview | View |\n'
    body += '| --- | --- | --- | --- |\n'
    body += f'| (All) | N/A | N/A | [View](./view/all.md) |\n'
    
    for pack, v in data.items():
        pack_name = mapping.get(pack, pack)

        pack_paths = list(v.get('icons', {}).keys())
        if pack_paths == []:
            pack_paths = list(v.get('special', {}).keys())

        preview_path = pack_paths[0]
        preview_name = os.path.split(preview_path)[-1]

        body += f'| {pack} | {pack_name} | ![{preview_name}]({preview_path}) | [View](./view/{pack}.md) |\n'

    readme = readme.replace('{body}', body)

    with open('README.md', 'w+') as f:
        f.write(readme)

def update_view(data: dict, mapping: dict):
    with open('view/all.md', 'w+') as f:
        f.write('## All icons\n')

        for pack, v in data.items():
            pack_name = mapping.get(pack, pack)

            body = f'## {pack} [{pack_name}]\n'

            body += '| Filename | Emoji | GIF | PNG |\n'
            body += '| --- | --- | --- | --- |\n'

            for path, emoji in v.get('icons', {}).items():
                path_png = gif2png(path)

                fname = os.path.split(path)[-1]
                name = os.path.splitext(fname)[0]
                body += f'| {name} | `{emoji}` | ![{name}](../{path}) | ![{name}](../{path_png}) |\n'
            
            body += '\n'

            with open(f'view/{pack}.md', 'w+') as g:
                g.write(body)
            
            f.write(body)

def main():
    main_js_url= get_main_js_url()
    data = parse_main_js(main_js_url)

    with open('data.json', 'w+', encoding='utf8') as f:
        json.dump(data, f, indent=4, ensure_ascii=False)
    
    with open('mapping.json') as f:
        mapping = json.load(f)
    
    download_all(data, fmt='gif')
    download_all(data, fmt='png')

    update_readme(data, mapping)
    update_view(data, mapping)

if __name__ == '__main__':
    main()