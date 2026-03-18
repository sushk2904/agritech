# Testing Strategy \& Demo Execution

## Unit \& Security Tests (Java / Node)

* **Memory Leak Test:** Verify that `byte\\\[]` arrays used for AES keys are provably zeroed out after the `finally` block in Java.
* **ZKP Circuit Integrity:** Supply `snarkjs` with a mathematically valid `proof.json` (expect true) and a tampered proof (expect immediate rejection).
* **Sensor Fusion Test:** Inject a mock dataset of heavy cloud cover optical data mixed with clear SAR data; assert the model correctly identifies underlying crop structural damage.
* **UI Accessibility (a11y) Test:** Ensure all shadcn/ui components (especially voice trigger buttons and modals) have proper ARIA labels and are keyboard navigable.

## Integration Tests

* **The Bhashini Loop:** Mock an incoming audio stream in Marathi -> assert intent extraction maps to `CheckClaimStatus` -> assert NMT translates the response back to Marathi audio.
* **AgriStack UFSI Mock:** Assert that a valid Farmer ID fetches the correct PostGIS Geometry polygon without crashing the backend.

## The 5-Phase Hackathon Demo Strategy (Manual Verification)

To win, the application must run flawlessly in this exact sequence:

1. **The God View:** Show the Python microservice pulling SAR data, finding a flood, and creating an AI-geofence.
2. **The Voice of the User:** A judge acts as a farmer, using native language voice (Bhashini) on the frontend PWA (with a clean shadcn `Sheet` or `Dialog` showing active listening) to report damage.
3. **The Silent Proof:** Console shows `snarkjs` generating the Point-in-Polygon proof locally, followed by AES/RSA encapsulation. Exact coordinates never leave the browser.
4. **The Blind Validator:** Backend logs show successful verification of the ZK proof against the AI geofence and triggers the PFMS disbursal API.
5. **The Ultimate Reveal (Split Screen):** Show the Postgres DB filled with absolute AES/RSA encrypted gibberish next to the admin UI showing decrypted logic and the mobile phone receiving the localized WhatsApp accountability notification.

