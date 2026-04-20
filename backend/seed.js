const { Pool } = require("pg");
require("dotenv").config();

// Direct connection to your local Postgres
const pool = new Pool({
  connectionString: "postgresql://postgres:Katlamac123%3F@localhost:5432/zenith_io_db"
});

async function main() {
  const client = await pool.connect();
  // Your real Clerk ID found in the dashboard
  const REAL_CLERK_ID = "user_3CO4XmU8iY8X963zRVuF2W"; 

  try {
    console.log("--- STARTING SYSTEM RESET FOR ZENITH_ADMIN ---");
    await client.query("BEGIN");

    // 1. Link your real Clerk ID to the Database
    const userRes = await client.query(`
      INSERT INTO users (external_id, xp, level, streak)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (external_id) DO UPDATE 
      SET xp = 0, level = 1, streak = 0
      RETURNING id;
    `, [REAL_CLERK_ID, 0, 1, 0]);

    const internalId = userRes.rows[0].id;
    console.log(`IDENTITY SYNCED: ${REAL_CLERK_ID}. Internal Database ID: ${internalId}`);

    // 2. Clear old test data
    await client.query("DELETE FROM contracts WHERE user_id = $1", [internalId]);
    console.log("OLD CONTRACTS PURGED.");

    // 3. Create the first "Real" mission
    const deadline = new Date();
    deadline.setMinutes(deadline.getMinutes() + 5);

    await client.query(`
      INSERT INTO contracts (task_name, duration_minutes, stake_amount, status, user_id, deadline)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, ["FIRST STRIKE", 5, 100, 'ACTIVE', internalId, deadline]);

    await client.query("COMMIT");
    console.log("--- SYSTEM READY: RESTART SERVER AND REFRESH APP ---");
  } catch (e) {
    await client.query("ROLLBACK");
    console.error("SEED FAILED:", e.message);
  } finally {
    client.release();
    await pool.end();
  }
}

main();