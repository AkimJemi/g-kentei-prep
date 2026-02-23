import { spawn } from 'child_process';
import pkg from 'pg';
const { Pool } = pkg;

const connectionString = 'postgresql://g_kentei_prep_app_db_user:0vZFHekJvsuMexPcBCKx5Ix4Noy7WZJO@dpg-d63nv6cr85hc73bckig0-a.oregon-postgres.render.com/g_kentei_prep_app_db';
const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

const delay = ms => new Promise(res => setTimeout(res, ms));

async function getMissingCount() {
    try {
        const missing = await pool.query("SELECT COUNT(*) FROM g_kentei_questions WHERE optionexplanations IS NULL OR optionexplanations = '[]' OR optionexplanations = 'null'");
        return parseInt(missing.rows[0].count, 10);
    } catch (e) {
        console.error("Error checking DB count:", e.message);
        return -1;
    }
}

function runEnrichScript() {
    return new Promise((resolve) => {
        console.log("Starting auto_enrich_llm.js...");
        // Use the relative path to the existing script we just created
        const child = spawn('node', ['server/auto_enrich_llm.js'], { stdio: 'inherit' });

        child.on('close', (code) => {
            console.log(`child process exited with code ${code}`);
            resolve(code);
        });
    });
}

async function startMasterLoop() {
    console.log("Starting Master Loop...");
    let count = await getMissingCount();
    
    while (count > 0) {
        console.log(`Current missing count: ${count}. Running script...`);
        const exitCode = await runEnrichScript();
        
        console.log(`Script finished or crashed (code: ${exitCode}). Retrying in 5 seconds...`);
        await delay(5000);
        
        count = await getMissingCount();
    }
    
    console.log("All questions successfully enriched!");
    process.exit(0);
}

startMasterLoop();
