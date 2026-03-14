import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import path from "path";

const db = new Database(path.join(process.cwd(), "data", "canopy.db"));
db.pragma("foreign_keys = ON");

const users = [
  { id: "admin_001", name: "Jessica Martinez", email: "jessica@canopy.dev",  role: "admin",  password: "admin123" },
  { id: "user_001",  name: "Maria Rodriguez",  email: "maria@example.com",   role: "client", password: "user123" },
];

for (const u of users) {
  const hash = bcrypt.hashSync(u.password, 10);
  db.prepare(`INSERT OR REPLACE INTO users (id, name, email, password_hash, role)
              VALUES (?, ?, ?, ?, ?)`).run(u.id, u.name, u.email, hash, u.role);
  console.log(`✓ ${u.role}: ${u.email} / ${u.password}`);
}
db.close();