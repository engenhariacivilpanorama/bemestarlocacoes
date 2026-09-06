const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const testDbPath = path.resolve(__dirname, "../prisma/test.db");
if (fs.existsSync(testDbPath)) {
  fs.rmSync(testDbPath);
}

execSync("npx prisma db push --skip-generate", {
  stdio: "inherit",
  env: {
    ...process.env,
    DATABASE_URL: `file:${testDbPath}`,
  },
});
