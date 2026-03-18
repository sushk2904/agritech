# Tech Stack & Tooling

## Frontend (The Inclusive Vault)
- **Framework:** Next.js (React), deployed as an offline-capable PWA.
- **Styling & UI Components:** Tailwind CSS + **shadcn/ui**. (Use shadcn components like `Sheet`, `Dialog`, `Toast`, and `Form` to handle Bhashini voice overlays and ZK-proof loading states gracefully).
- **Maps:** `maplibre-gl` (No Google Maps).
- **Crypto & ZKP:** WebCrypto API (AES-GCM/RSA-OAEP), `snarkjs` (compiles ZK proofs to WASM for client-side execution).
- **State:** React Context / Hooks.
- **Voice AI:** WebSockets connecting to Bhashini APIs.

## Backend (The DPI Gateway & Verifier)
- **Core:** Java 25, Spring Boot 3.2+.
- **Security:** Spring Security 6 (JWT + Custom crypto filter chains).
- **ZKP Verification:** Lightweight GraalVM polyglot context embedded in Spring Boot OR `web3j` to interact with an EVM smart contract verifier.
- **Database:** PostgreSQL 16 + PostGIS extension.
- **ORM:** Hibernate (configured for encrypted column storage), JTS Topology Suite.

## Microservice (The Truth - Spatial AI)
- **Language:** Python 3.11+.
- **Framework:** FastAPI.
- **Deep Learning:** PyTorch (for 1D-CNN/RNN sensor fusion).
- **Geospatial Processing:** `rasterio`, `shapely`, `numpy`.
- **Data Sources:** Copernicus Sentinel API (Optical + SAR), ISRO Bhuvan Geo-Platform APIs.