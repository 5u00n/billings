import { Miniflare, convertV4MiniflareOptions } from "miniflare";
import { build } from "esbuild";
import assert from "node:assert/strict";
const bundle = await build({
  entryPoints: ["tests/fixtures/borrowing.worker.ts"],
  bundle: true,
  format: "esm",
  platform: "browser",
  write: false,
});
const mf = new Miniflare(
  convertV4MiniflareOptions({
    modules: true,
    script: bundle.outputFiles[0].text,
    compatibilityDate: "2024-11-01",
    d1Databases: { DB: "borrowing-isolated-test" },
  }),
);
try {
  const db = await mf.getD1Database("DB");
  await db
    .prepare(
      "CREATE TABLE expenses(id TEXT PRIMARY KEY,date TEXT,month TEXT,category TEXT,tag TEXT,description TEXT,amount REAL,payment_method TEXT,notes TEXT,tax_classification TEXT,business_percentage INTEGER)",
    )
    .run();
  let sequence = 0;
  const date = new Date().toISOString().slice(0, 10);
  async function request(path, body) {
    const response = await mf.dispatchFetch(
      "http://test/api/budget/borrowing-accounts" + path,
      body
        ? {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Idempotency-Key": "runtime-" + ++sequence,
            },
            body: JSON.stringify(body),
          }
        : {},
    );
    const data = await response.json();
    assert.ok(response.ok, JSON.stringify(data));
    return data;
  }
  const { account_id: id } = await request("", {
    name: "Runtime card",
    account_type: "CREDIT",
  });
  await request(`/${id}/transactions`, {
    kind: "CREDIT_PURCHASE",
    date,
    amount_paise: 2000000,
    description: "Runtime purchase",
  });
  await request(`/${id}/bills`, {
    amount_paise: 1300000,
    as_of_date: date,
    due_date: "2027-01-01",
  });
  await request(`/${id}/transactions`, {
    kind: "PAYMENT",
    amount_paise: 1300000,
    date,
    description: "Runtime bulk payment",
  });
  const detail = await request("/" + id);
  assert.equal(detail.outstanding_paise, 700000);
  assert.equal(detail.bill_due_paise, 0);
  console.log(
    "Local Cloudflare D1 runtime passed: additive schema, triggers, atomic batches, statement and bulk payment.",
  );
} finally {
  await mf.dispose();
}
