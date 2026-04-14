/**
 * Dry-run LMT adapter — aucune base de données, aucun schéma.
 * Lance avec : npx dotenv-cli -e ../../.env -- tsx test-lmt.ts
 */
import { LmtAdapter } from "../src/adapters/sms/lmt.adapter";

const apiKey = process.env.LMT_API_KEY;
const secret = process.env.LMT_SECRET;
const senderId = process.env.LMT_SENDER_ID ?? "ReachDem";

if (!apiKey || !secret) {
  console.error("❌  LMT_API_KEY et LMT_SECRET doivent être dans .env");
  process.exit(1);
}

const adapter = new LmtAdapter(apiKey, secret);

const numbers = ["237654495152", "237699875974"];

for (const number of numbers) {
  console.log(`\n=== Test vers ${number} ===`);
  const result = await adapter.send({
    to: number,
    from: senderId,
    text: "Test ReachDem via LMT Group",
  });

  console.log(JSON.stringify(result, null, 2));

  if (result.success) {
    console.log(`✅  Envoyé ! ID provider : ${result.providerMessageId}`);
  } else {
    console.log(`❌  Échec : [${result.errorCode}] ${result.errorMessage}`);
  }
}
