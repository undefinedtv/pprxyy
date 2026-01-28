export const config = {
  runtime: 'edge',
};

export default async function handler(request) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get('url');
  
  if (!targetUrl) {
    return new Response('Kullanım: ?url=https://site.com/video.m3u8', { status: 400 });
  }

  try {
    const decodedUrl = decodeURIComponent(targetUrl);
    
    // Headerları daha sade ve gerçekçi tutuyoruz
    // Chrome 144 yerine güncel ve standart bir sürüm kullanıyoruz
    const myHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Referer': 'https://trgoals1517.xyz/',
      'Origin': 'https://trgoals1517.xyz',
      'Accept': '*/*',
      'Accept-Language': 'en-US,en;q=0.9',
      // Sec-CH-UA headerlarını kaldırdık, çünkü Vercel'in TLS parmak iziyle uyuşmazsa yakalanırsın.
    };

    const response = await fetch(decodedUrl, {
      method: 'GET',
      headers: myHeaders,
      redirect: 'follow' // Yönlendirmeleri takip et
    });

    // Eğer hedef site hala engelliyorsa (403 veya Cloudflare HTML sayfası dönüyorsa)
    if (response.status === 403 || response.status === 503) {
       // Cloudflare HTML içeriğini görmek yerine hata döndür
       return new Response("Hedef site Vercel IP'lerini engelliyor (Cloudflare WAF).", { status: 403 });
    }

    // Response'u yeniden oluştur
    const newResponse = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Cache-Control': 'no-cache',
        // Orijinal içerik tipini koru veya manuel ayarla
        'Content-Type': response.headers.get('Content-Type') || 'application/vnd.apple.mpegurl'
      }
    });

    return newResponse;
    
  } catch (error) {
    return new Response(`Proxy Hatası: ${error.message}`, { status: 500 });
  }
}
