import { buildApp } from "./app.js";
import { seedIfEmpty } from "./seed.js";

const PORT = Number(process.env.PORT || 8080);
const HOST = process.env.HOST || "0.0.0.0";

await seedIfEmpty();
const app = buildApp();
app.listen({ port: PORT, host: HOST }).then(() => {
  console.log(`Happy Star running at http://${HOST}:${PORT}`);
});
