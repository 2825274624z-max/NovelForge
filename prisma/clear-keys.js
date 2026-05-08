const { DatabaseSync } = require("node:sqlite");
const path = require("node:path");
const fs = require("node:fs");

const paths = [
  path.resolve("prisma/dev.db"),
  path.resolve(".next/standalone/prisma/dev.db"),
];

for (const p of paths) {
  if (fs.existsSync(p)) {
    const db = new DatabaseSync(p);
    try {
      db.exec("UPDATE AISettings SET apiKey = ''");
      console.log("Cleared:", p);
    } catch (e) {
      console.log("Skip:", p, e.message);
    }
    db.close();
  }
}
