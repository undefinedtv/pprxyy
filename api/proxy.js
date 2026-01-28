// export const config = { runtime: 'edge' }; // <--- BU SATIRI SİLİYORUZ

export default async function handler(req, res) {
  const { url } = req.query; // Node.js yapısında query böyle alınır

  if (!url) {
    return res.status(400).send('Kullanım: ?url=https://site.com/video.m3u8');
  }

  try {
    const targetUrl = decodeURIComponent(url);
    
    // Node.js ortamında fetch kullanıyoruz
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Referer': 'https://trgoals1517.xyz/',
        'Origin': 'https://trgoals1517.xyz',
        'Accept': '*/*',
      },
      redirect: 'follow'
    });

    if (!response.ok) {
       // Cloudflare veya 403 hatası detayını görmek için:
       const errorText = await response.text();
       console.log("Hata Detayı:", errorText); // Vercel loglarında görünür
       if(response.status === 403) return res.status(403).send("Hala engelleniyor (IP Ban).");
    }

    // Headerları ayarla
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    
    // İçerik tipini kopyala
    const contentType = response.headers.get('content-type');
    if (contentType) {
      res.setHeader('Content-Type', contentType);
    }

    // Yayını stream olarak aktar (Node.js Stream)
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    res.status(200).send(buffer);

  } catch (error) {
    res.status(500).send(`Hata: ${error.message}`);
  }
}
