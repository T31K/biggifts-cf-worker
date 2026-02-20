import injectCode from "./inject.js?raw";

export default {
  async fetch(request) {
    const url = new URL(request.url);

    // Serve injected script
    if (url.pathname === "/cf-inject.js") {
      return new Response(injectCode, {
        headers: {
          "content-type": "application/javascript",
        },
      });
    }

    const response = await fetch(request);

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) {
      return response;
    }

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
