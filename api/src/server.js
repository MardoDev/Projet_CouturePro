const { createApp } = require("./app");

const app = createApp();
const port = Number(process.env.PORT || 4000);

app.listen(port, () => {
  console.log(`C.D.P API listening on http://localhost:${port}`);
});
