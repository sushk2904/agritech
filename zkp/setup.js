const { execSync } = require('child_process');

console.log("Starting ZK-SNARK Groth16 Trusted Setup Pipeline...");

function run(cmd) {
    console.log(`\n========================================`);
    console.log(`Executing: ${cmd}`);
    console.log(`========================================`);
    execSync(cmd, { stdio: 'inherit' });
}

try {
    // 1. Compile the Circuit
    run("circom geofence.circom --r1cs --wasm --sym");

    // 2. Start Powers of Tau phase 1 (bn128 curve, power 12 is sufficient)
    run("npx snarkjs powersoftau new bn128 12 pot12_0000.ptau -v");
    
    // Contribute entropy to phase 1
    run('npx snarkjs powersoftau contribute pot12_0000.ptau pot12_0001.ptau --name="Phase1Contribution" -v -e="random_terranode_entropy_seed_123"');
    
    // Prepare phase 2
    run("npx snarkjs powersoftau prepare phase2 pot12_0001.ptau pot12_final.ptau -v");

    // 3. Generate Groth16 Proving Key (.zkey) setup
    run("npx snarkjs groth16 setup geofence.r1cs pot12_final.ptau geofence_0000.zkey");
    
    // Contribute securely to phase 2 zkey
    run('npx snarkjs zkey contribute geofence_0000.zkey geofence_final.zkey --name="Phase2Contribution" -v -e="another_random_entropy_seed_for_zkey_456"');

    // 4. Export the final Verification Key (for Java Backend / Smart Contract Verifier)
    run("npx snarkjs zkey export verificationkey geofence_final.zkey verification_key.json");

    console.log("\nSuccess! Proving Key, WASM, and verification_key.json have been generated.");
} catch(err) {
    console.error("\nTrusted Setup Pipeline Failed:", err.message);
    process.exit(1);
}
