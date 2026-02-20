export default {
  async fetch(request) {
    const url = new URL(request.url);

    // 1️⃣ Serve injected JS from Worker itself
    if (url.pathname === "/cf-inject.js") {
      return new Response(
        `
        console.log("Injected via Cloudflare Worker");
        alert("Worker injection works");
        `,
        {
          headers: {
            "content-type": "application/javascript",
          },
        },
      );
    }

    // 2️⃣ Fetch original response
    const response = await fetch(request);

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) {
      return response;
    }

    // 3️⃣ Inject external script (CSP-safe because it's 'self')
    return new HTMLRewriter()
      .on("body", {
        element(el) {
          el.append(`<script src="/cf-inject.js" defer></script>`, {
            html: true,
          });
        },
      })
      .transform(response);
  },
};
