const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createApp } = require("../src/app");

test("le serveur démarre et /health répond ok", async () => {
  const app = createApp();
  const server = app.listen(0);
  const { port } = server.address();

  try {
    const response = await fetch(`http://127.0.0.1:${port}/health`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.status, "ok");
    assert.equal(body.service, "couture-dynamic-pro-api");
  } finally {
    server.close();
  }
});
