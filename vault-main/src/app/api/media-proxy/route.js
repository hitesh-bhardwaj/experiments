const ALLOWED_HOSTS = new Set([
  "pub-8abee449136941f5b0a1cd2c014534e9.r2.dev",
]);

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const source = searchParams.get("url");

  if (!source) {
    return Response.json({ error: "Missing media URL." }, { status: 400 });
  }

  let sourceUrl;

  try {
    sourceUrl = new URL(source);
  } catch {
    return Response.json({ error: "Invalid media URL." }, { status: 400 });
  }

  if (
    sourceUrl.protocol !== "https:" ||
    !ALLOWED_HOSTS.has(sourceUrl.hostname)
  ) {
    return Response.json(
      { error: "Media host is not allowed." },
      { status: 400 }
    );
  }

  const upstreamHeaders = {};
  const range = request.headers.get("range");
  if (range) {
    upstreamHeaders["range"] = range;
  }

  const response = await fetch(sourceUrl, {
    headers: upstreamHeaders,
    next: { revalidate: 86400 },
  });

  if (!response.ok && response.status !== 206) {
    return Response.json(
      { error: `Media request failed with ${response.status}.` },
      { status: response.status }
    );
  }

  const contentType =
    response.headers.get("content-type") || "application/octet-stream";

  const responseHeaders = {
    "content-type": contentType,
    "cache-control": "public, max-age=86400, s-maxage=86400",
    "access-control-allow-origin": "*",
    "cross-origin-resource-policy": "cross-origin",
    "accept-ranges": "bytes",
  };

  const contentRange = response.headers.get("content-range");
  if (contentRange) {
    responseHeaders["content-range"] = contentRange;
  }

  const contentLength = response.headers.get("content-length");
  if (contentLength) {
    responseHeaders["content-length"] = contentLength;
  }

  return new Response(response.body, {
    status: response.status,
    headers: responseHeaders,
  });
}
