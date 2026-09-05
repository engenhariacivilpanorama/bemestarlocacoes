import path from "path";

process.env.DATABASE_URL = `file:${path.resolve(__dirname, "../../prisma/test.db")}`;
process.env.JWT_SECRET = "test-secret";
process.env.UPLOADS_DIR = path.resolve(__dirname, "../../uploads-test");
