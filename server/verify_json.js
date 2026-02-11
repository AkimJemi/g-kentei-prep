import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const jsonPath = join(__dirname, '../questions_export.json');

try {
    const data = readFileSync(jsonPath, 'utf8');
    const questions = JSON.parse(data);
    const q = questions.find(q => q.id === 2011);
    
    if (q) {
        console.log(`Question 2011 found.`);
        if (q.optionExplanations && q.optionExplanations.length > 0) {
            console.log(`SUCCESS: optionExplanations present for 2011.`);
            console.log(JSON.stringify(q.optionExplanations, null, 2));
        } else {
            console.log(`FAILURE: optionExplanations MISSING for 2011.`);
        }
    } else {
        console.log(`FAILURE: Question 2011 NOT FOUND.`);
    }
} catch (err) {
    console.error('Error reading/parsing JSON:', err);
}
