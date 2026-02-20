export default {
  async fetch(request) {
    const response = await fetch(request);

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) {
      return response;
    }

    return new HTMLRewriter()
      .on("body", {
        element(el) {
          el.append(`<script>alert("Worker injection works");</script>`, {
            html: true,
          });
        },
      })
      .transform(response);
  },
};
