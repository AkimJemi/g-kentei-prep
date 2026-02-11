import autocannon from 'autocannon';

const endpoints = [
    { name: 'Questions', path: '/api/questions?limit=10' },
    { name: 'Categories', path: '/api/categories' },
    { name: 'Users', path: '/api/users?limit=10' }
];

const BASE_URL = process.env.BASE_URL || 'http://localhost:3012';

async function runBenchmark(endpoint) {
    return new Promise((resolve, reject) => {
        const instance = autocannon({
            url: `${BASE_URL}${endpoint.path}`,
            connections: 10,
            pipelining: 1,
            duration: 10
        }, (err, result) => {
            if (err) {
                return reject(err);
            }
            resolve(result);
        });

        autocannon.track(instance, { renderProgressBar: false });
    });
}

function printResult(name, result) {
    console.log(`\n--- ${name} Benchmark ---`);
    console.log(`Requests/sec: ${result.requests.average}`);
    console.log(`Latency (ms):`);
    console.log(`  p50: ${result.latency.p50}`);
    console.log(`  p95: ${result.latency.p95}`);
    console.log(`  p99: ${result.latency.p99}`);
    console.log(`Errors: ${result.errors}`);
}

async function main() {
    console.log(`Starting performance tests against ${BASE_URL}...`);
    
    for (const endpoint of endpoints) {
        console.log(`Testing ${endpoint.name}...`);
        try {
            const result = await runBenchmark(endpoint);
            printResult(endpoint.name, result);
        } catch (err) {
            console.error(`Error testing ${endpoint.name}:`, err);
        }
    }
}

main();
