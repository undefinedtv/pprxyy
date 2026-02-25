export const config = {
  runtime: "edge",
};

// İzin verilen domainler — gerekirse ekle
const ALLOWED_DOMAINS = [
  "kablowebtv.com",
  "tvheryerde.com",
  "akamaized.net",
  "cloudfront.net",
  "cdntr.live",
  "cdn.live",
  "level3.net",
  "fastly.net",
];

const FORWARD_HEADERS = [
  "user-agent",
  "accept",
  "accept-language",
  "range",
  "origin",
  "referer",
];

// Domain whitelist kontrolü
function isAllowed(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return ALLOWED_DOMAINS.some(
      (d) => hostname === d || hostname.endsWith("." + d)
    );
  } catch {
    return false;
  }
}

// Proxy base URL'ini isteğin kendisinden al
function getProxyBase(req: Request): string {
  const u = new URL(req.url);
  return `${u.protocol}//${u.host}`;
}

// m3u8 içindeki segment/playlist URL'lerini proxy'den geçirecek şekilde yeniden yaz
function rewriteM3U8(text: string, sourceUrl: string, proxyBase: string): string {
  const baseDir = sourceUrl.substring(0, sourceUrl.lastIndexOf("/") + 1);

  return text
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();

      // Boş satır veya yorum → dokunma
      if (!trimmed || trimmed.startsWith("#")) return line;

      // Göreceli URL → mutlak
      const absolute = trimmed.startsWith("http")
        ? trimmed
        : baseDir + trimmed;

      // Proxy üzerinden yönlendir
      const encoded = encodeURIComponent(absolute);
      return `${proxyBase}/proxy?url=${encoded}`;
    })
    .join("\n");
}

export default async function handler(req: Request): Promise<Response> {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
        "Access-Control-Allow-Headers": "*",
      },
    });
  }

  const reqUrl = new URL(req.url);
  const targetEncoded = reqUrl.searchParams.get("url");

  // url parametresi zorunlu
  if (!targetEncoded) {
    return new Response(
      JSON.stringify({ error: "url parametresi eksik" }),
      {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }

  let targetUrl: string;
  try {
    targetUrl = decodeURIComponent(targetEncoded);
    new URL(targetUrl); // Geçerli URL mi kontrol et
  } catch {
    return new Response(
      JSON.stringify({ error: "Geçersiz URL" }),
      {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }

  // Whitelist kontrolü
  if (!isAllowed(targetUrl)) {
    const { hostname } = new URL(targetUrl);
    return new Response(
      JSON.stringify({ error: `İzinsiz domain: ${hostname}` }),
      {
        status: 403,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }

  // Güvenli header'ları ilet
  const forwardHeaders = new Headers();
  for (const [key, value] of req.headers.entries()) {
    if (FORWARD_HEADERS.includes(key.toLowerCase())) {
      forwardHeaders.set(key, value);
    }
  }

  try {
    const upstream = await fetch(targetUrl, {
      method: req.method,
      headers: forwardHeaders,
      redirect: "follow",
    });

    const contentType = upstream.headers.get("content-type") ?? "";
    const isM3U8 =
      contentType.includes("mpegurl") ||
      targetUrl.split("?")[0].endsWith(".m3u8");

    // Yanıt header'larını hazırla
    const responseHeaders = new Headers({
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "*",
      "Content-Type": contentType || "application/octet-stream",
      "Cache-Control": upstream.headers.get("cache-control") ?? "no-cache",
    });

    // Video player için Range desteği
    const contentRange = upstream.headers.get("content-range");
    const acceptRanges = upstream.headers.get("accept-ranges");
    if (contentRange) responseHeaders.set("Content-Range", contentRange);
    if (acceptRanges) responseHeaders.set("Accept-Ranges", acceptRanges);

    // m3u8 → içeriği rewrite et
    if (isM3U8 && req.method !== "HEAD") {
      const text = await upstream.text();
      const rewritten = rewriteM3U8(text, targetUrl, getProxyBase(req));
      return new Response(rewritten, {
        status: upstream.status,
        headers: responseHeaders,
      });
    }

    // .ts segment veya diğer içerik → direkt stream et
    return new Response(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });

  } catch (err) {
    return new Response(
      JSON.stringify({ error: `Upstream hatası: ${String(err)}` }),
      {
        status: 502,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
}
