import pkg from 'pg';
const { Pool } = pkg;
import { GoogleGenAI } from '@google/genai';

// Initialize Gemini client with the NEW key provided by the user
const ai = new GoogleGenAI({ apiKey: 'AIzaSyCHWTkWvvsnjWK5L-T-c_SO0fyF7AHKScg' });

const connectionString = 'postgresql://g_kentei_prep_app_db_user:0vZFHekJvsuMexPcBCKx5Ix4Noy7WZJO@dpg-d63nv6cr85hc73bckig0-a.oregon-postgres.render.com/g_kentei_prep_app_db';
const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

const delay = ms => new Promise(res => setTimeout(res, ms));

async function generateExplanations(question, options, correctAnswerIdx, explanation, retries = 3) {
    const prompt = `
You are an expert AI instructor for the G-Kentei (G検定) certification.
Given a question, its options, the correct answer index (0-3), and the overall explanation, generate a specific, concise explanation for EACH of the 4 options.

Respond ONLY with a valid JSON object containing a single key "explanations" which maps to an array of 4 strings.
Example: {"explanations": ["Reason for option 0...", "Reason for option 1...", "Reason for option 2...", "Reason for option 3..."]}

- Do NOT wrap the JSON in markdown code blocks like \`\`\`json.
- Maintain a polite, educational tone in Japanese.
- Address WHY the specific option is correct or incorrect based on the overall explanation.

Question: ${question}
Options: ${JSON.stringify(options)}
Correct Option Index (0-3): ${correctAnswerIdx}
Overall Explanation: ${explanation}
`;

    try {
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('LLM Generation Timeout after 30000ms')), 30000)
        );

        const responsePromise = ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
            }
        });

        const response = await Promise.race([responsePromise, timeoutPromise]);
        
        let resultStr = response.text;
        resultStr = resultStr.replace(/^\`\`\`(json)?\n?/mi, '').replace(/\`\`\`$/m, '').trim();

        const resultJson = JSON.parse(resultStr);
        
        if (resultJson.explanations && Array.isArray(resultJson.explanations) && resultJson.explanations.length === 4) {
            return resultJson.explanations;
        } else {
            throw new Error('Invalid LLM output format: ' + resultStr);
        }
    } catch (error) {
        if (error.status === 429 || (error.message && error.message.includes('429'))) {
             console.log(`[Rate Limit Hit] Waiting 15 seconds before retry... (${retries} retries left)`);
             await delay(15000); // Wait 15s on 429
             if (retries > 0) return generateExplanations(question, options, correctAnswerIdx, explanation, retries - 1);
        }
        console.error("LLM Generation Error:", error.message);
        return null;
    }
}

async function bulkEnrichLLM() {
    console.log('[Auto Enrich] Starting mass enrichment with new API key...');
    
    try {
        const result = await pool.query(
            `SELECT id, category, question, options, correctAnswer, explanation 
             FROM g_kentei_questions 
             WHERE optionexplanations IS NULL 
                OR optionexplanations = '[]' 
                OR optionexplanations = 'null'
             ORDER BY id`
        );
        
        const questionsToProcess = result.rows;
        console.log(`[Auto Enrich] Found ${questionsToProcess.length} questions missing explanations.`);

        let updatedCount = 0;
        let errorCount = 0;

        // Assuming this new key has a higher tier, but we'll still keep a small 1s delay to be safe
        // If it's a paid tier, 1s is more than enough. If it's another free key, it might hit 429s again, 
        // in which case the retry logic will safely catch it.
        const RATE_LIMIT_DELAY = 1000; 

        for (let i = 0; i < questionsToProcess.length; i++) {
            const row = questionsToProcess[i];
            
            let opts = row.options;
            if (typeof opts === 'string') {
                try { opts = JSON.parse(opts); } catch (e) { console.error(`Failed to parse options for ID ${row.id}`); continue; }
            }

            console.log(`Processing ${i + 1}/${questionsToProcess.length} (ID: ${row.id})...`);
            
            const generatedExplanations = await generateExplanations(row.question, opts, row.correctanswer, row.explanation);

            if (generatedExplanations) {
                await pool.query(
                    `UPDATE g_kentei_questions SET optionExplanations = $1 WHERE id = $2`,
                    [JSON.stringify(generatedExplanations), row.id]
                );
                updatedCount++;
            } else {
                errorCount++;
            }

            await delay(RATE_LIMIT_DELAY);
        }

        console.log(`[Auto Enrich] Finished! Updated: ${updatedCount}, Errors: ${errorCount}`);
    } catch (err) {
        console.error('[Auto Enrich] Error:', err.message);
    } finally {
        await pool.end();
    }
}

bulkEnrichLLM();
