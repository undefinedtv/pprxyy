# app.py
from flask import Flask, Response, request
import requests
from urllib.parse import urljoin, quote

app = Flask(__name__)

@app.route('/')
def proxy():
    stream_url = request.args.get('url')
    referer = request.args.get('referer', '')
    origin = referer.rstrip('/') if referer else ''
    
    if not stream_url:
        return "Usage: /?url=STREAM&referer=REF"
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36',
        'Referer': referer,
        'Origin': origin,
        'Accept': '*/*',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'cross-site',
    }
    
    try:
        resp = requests.get(stream_url, headers=headers, timeout=15)
        
        if resp.status_code != 200:
            return Response(f"Error: {resp.status_code}", status=resp.status_code)
        
        content_type = resp.headers.get('Content-Type', '')
        
        if '.m3u8' in stream_url or 'mpegurl' in content_type:
            content = resp.text
            base_url = stream_url.rsplit('/', 1)[0] + '/'
            host = request.host_url.rstrip('/')
            
            lines = []
            for line in content.split('\n'):
                t = line.strip()
                if t and not t.startswith('#'):
                    seg = t if t.startswith('http') else base_url + t
                    lines.append(f"{host}/?url={quote(seg)}&referer={quote(referer)}")
                else:
                    lines.append(line)
            
            return Response('\n'.join(lines), mimetype='application/vnd.apple.mpegurl')
        
        return Response(resp.content, mimetype=content_type)
        
    except Exception as e:
        return Response(str(e), status=500)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=10000)
