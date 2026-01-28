export const config = {
  runtime: 'edge',
};

export default async function handler(request) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get('url');
  
  if (!targetUrl) {
    return new Response('Usage: ?url=https://example.com/stream.m3u8', { 
      status: 400,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
  
  try {
    const decodedUrl = decodeURIComponent(targetUrl);
    
    const response = await fetch(decodedUrl, {
      headers: {
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9,tr;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Origin': 'https://trgoals1517.xyz',
        'Referer': 'https://trgoals1517.xyz/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36',
        'Sec-CH-UA': '"Not(A:Brand";v="8", "Chromium";v="144"',
        'Sec-CH-UA-Mobile': '?0',
        'Sec-CH-UA-Platform': '"Windows"',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'cross-site'
      }
    });
    
    // Response'u klonla ve header'ları ayarla
    const newResponse = new Response(response.body, {
      status: response.status,
      statusText: response.statusText
    });
    
    // CORS ve Content-Type ayarla
    newResponse.headers.set('Access-Control-Allow-Origin', '*');
    newResponse.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    newResponse.headers.set('Access-Control-Allow-Headers', '*');
    
    if (decodedUrl.includes('.m3u8')) {
      newResponse.headers.set('Content-Type', 'application/vnd.apple.mpegurl');
    } else if (decodedUrl.includes('.ts')) {
      newResponse.headers.set('Content-Type', 'video/MP2T');
    } else if (decodedUrl.includes('.jpg')) {
      newResponse.headers.set('Content-Type', 'image/jpeg');
    }
    
    return newResponse;
    
  } catch (error) {
    return new Response(`Error: ${error.message}`, { 
      status: 500,
      headers: {
        'Content-Type': 'text/plain',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}
