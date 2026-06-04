const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const clerkId = process.env.ADMIN_CLERK_ID;
  if (!clerkId) throw new Error("Missing ADMIN_CLERK_ID in backend/.env");

  const client = await pool.connect();
  try {
    const res = await client.query(
      "UPDATE users SET is_admin = true WHERE external_id = $1 RETURNING id, external_id, username",
      [clerkId]
    );
    if (res.rowCount === 0) {
      console.error(`No user found with external_id = '${clerkId}'. Sign in once with the account first, then re-run.`);
    } else {
      const u = res.rows[0];
      console.log(`Admin granted to: ${u.username ?? u.external_id} (db id: ${u.id})`);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => { console.error(err.message); process.exit(1); });
