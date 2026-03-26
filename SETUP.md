# TerraNode DPI - Setup & Running Guide

## Project Overview

TerraNode is a **Digital Public Infrastructure (DPI)** platform for secure, privacy-preserving crop damage claims using:
- **Next.js PWA Frontend** (React + TypeScript)
- **Spring Boot Backend** (Java 21, PostgreSQL)
- **Zero-Knowledge Proofs** (ZK-SNARKs via snarkjs)
- **Hybrid Encryption** (AES-256-GCM + RSA-OAEP)

---

## Prerequisites

Install these before running the project:

### Frontend (Next.js)
- **Node.js 18+** - [Download](https://nodejs.org/)
- **npm** (comes with Node.js)

### Backend (Spring Boot)
- **Java 21** - [Download](https://www.oracle.com/java/technologies/downloads/#java21)
- **Maven 3.8+** - [Download](https://maven.apache.org/download.cgi)
- **PostgreSQL 14+** - [Download](https://www.postgresql.org/download/)

### Verification
```bash
# Check Node.js
node --version  # Should be v18.0.0 or higher

# Check npm
npm --version   # Should be 9.0.0 or higher

# Check Java
java -version   # Should be OpenJDK 21 or Oracle JDK 21

# Check Maven
mvn --version   # Should be 3.8.0 or higher

# Check PostgreSQL
psql --version  # Should be 14.0 or higher
```

---

## Project Structure

```
agritech/
├── frontend/
│   └── frontend/              # Next.js PWA application
│       ├── src/
│       │   ├── app/          # Pages (login, main)
│       │   ├── components/   # React components
│       │   ├── lib/          # API client, utilities
│       │   └── utils/        # Crypto functions
│       ├── public/           # Static assets
│       ├── package.json
│       └── .gitignore
├── backend/                   # Spring Boot application
│   ├── src/
│   │   ├── main/java/        # Controllers, services, entities
│   │   ├── resources/        # application.properties, SQL scripts
│   │   └── test/             # Unit tests
│   ├── pom.xml
│   └── .dockerignore
├── zkp/                       # Zero-Knowledge Proof circuits
│   ├── geofence.circom       # ZK circuit definition
│   └── package.json
├── microservice/              # Python AI confidence service
│   ├── main.py
│   └── requirements.txt
├── docker-compose.yml         # Docker Compose configuration
├── .gitignore                 # Root .gitignore
└── BACKEND_ENDPOINTS.md       # API documentation
```

---

## .gitignore Status ✅

### Root .gitignore (`/.gitignore`)
✅ **Ready** - Properly configured with:
- Credentials (`.env`, `*.pem`, `*.key`, `*.cert`, `*.jks`)
- Node.js artifacts (`node_modules/`, `.next/`, `build/`)
- Java/Maven artifacts (`target/`, `*.class`, `*.jar`)
- OS files (`.DS_Store`, `Thumbs.db`)
- IDE config (`.vscode/`, `.idea/`)
- Database volumes (`postgres_data/`, `pgdata/`)

### Frontend .gitignore (`/frontend/frontend/.gitignore`)
✅ **Ready** - Standard Next.js configuration

### No backend-specific .gitignore needed
Maven artifacts are covered by root `.gitignore`

---

## Setup Instructions

### Step 1: Database Setup (PostgreSQL)

Create the application database:

```bash
# Open PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE terranode;

# Create user
CREATE USER terranode_user WITH PASSWORD 'terranode_password';

# Grant privileges
ALTER ROLE terranode_user SET client_encoding TO 'utf8';
ALTER ROLE terranode_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE terranode_user SET default_transaction_deferrable TO on;
ALTER ROLE terranode_user SET default_transaction_read_only TO off;
GRANT ALL PRIVILEGES ON DATABASE terranode TO terranode_user;

# Exit
\q
```

### Step 2: Backend Setup & Build

```bash
# Navigate to backend
cd agritech/backend

# Build the application
mvn clean package -DskipTests

# This creates target/backend-0.0.1-SNAPSHOT.jar
```

### Step 3: Frontend Setup & Install

```bash
# Navigate to frontend
cd agritech/frontend/frontend

# Install dependencies
npm install

# This creates node_modules/ and installs all packages
```

---

## Running the Application

### Option A: Sequential (Terminal Approach)

**Terminal 1 - Start Backend:**
```bash
cd agritech/backend
java -jar target/backend-0.0.1-SNAPSHOT.jar
```
Expected output: `Started BackendApplication in X seconds`
Access: `http://localhost:8080`

**Terminal 2 - Start Frontend:**
```bash
cd agritech/frontend/frontend
npm run dev
```
Expected output: `▲ Next.js X.X.X | Ready in X milliseconds`
Access: `http://localhost:3000`

### Option B: Docker Compose (All-in-One)

```bash
# From project root
cd agritech
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

---

## Accessing the Application

### 1. Open Frontend
Navigate to: **`http://localhost:3000`**

### 2. Login Flow
1. **Email**: Enter any email address (e.g., `farmer@example.com`)
2. **Send OTP**: Click "Send OTP"
3. Backend sends verification code to email (check inbox/spam)
4. **Enter Code**: Copy the 4-digit code and paste
5. **Verify**: Click "Verify & Connect Wallet"

### 3. Main Application
- You'll be redirected to the claim submission page
- **Select Damage Type**: Flood, Drought, or Pest
- **Capture Photo**: Take/upload an image
- **Submit Claim**: Automatically encrypts and submits

### 4. API Endpoints
Check `BACKEND_ENDPOINTS.md` for full API documentation

---

## Key Features Implemented ✅

### Frontend Integration
✅ Authentication gateway with OTP  
✅ JWT token management (sessionStorage)  
✅ Protected routes (auto-redirect to login)  
✅ Claim submission with encryption  
✅ ZK-SNARK proof generation  
✅ RSA public key fetching  
✅ Memory wiping for sensitive data  

### Backend Ready
✅ Email OTP verification  
✅ JWT token generation  
✅ Claim processing pipeline  
✅ Crypto key management  
✅ ZK proof verification  
✅ AgriStack geofence support  

---

## Troubleshooting

### Frontend Issues

**Issue: `npm: command not found`**
- Solution: Install Node.js from https://nodejs.org/

**Issue: `Module not found` errors**
- Solution: Run `npm install` again

**Issue: `http://localhost:3000` shows blank page**
- Solution: Check browser console (F12) for errors
- Clear cache: `Ctrl+Shift+Delete`

### Backend Issues

**Issue: `java: command not found`**
- Solution: Install Java 21 and add to PATH

**Issue: `mvn: command not found`**
- Solution: Install Maven and add to PATH

**Issue: `Connection refused to database`**
- Solution: Ensure PostgreSQL is running and `terranode` database exists

**Issue: Port 8080 already in use**
- Solution: Kill process or change port in `application.properties`

### Database Issues

**Issue: `psql: command not found`**
- Solution: Add PostgreSQL bin directory to PATH

**Issue: Authentication failed**
- Solution: Check credentials in `application.properties`

---

## Environment Configuration

### Backend (`application.properties`)

Located at: `backend/src/main/resources/application.properties`

```properties
# Database
spring.datasource.url=jdbc:postgresql://localhost:5432/terranode
spring.datasource.username=terranode_user
spring.datasource.password=terranode_password

# JWT Secret (change in production)
jwt.secret=1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z7A8B9C0D1E2F

# Mail (SMTP configuration)
spring.mail.host=smtp.gmail.com
spring.mail.port=587
spring.mail.username=your-email@gmail.com
spring.mail.password=your-app-password
```

### Frontend (Environment Variables)

Create `.env.local` in `frontend/frontend/`:

```
NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1
NEXT_PUBLIC_ZKP_WASM_PATH=/zkp/geofence.wasm
NEXT_PUBLIC_ZKP_ZKEY_PATH=/zkp/geofence_final.zkey
```

---

## Production Considerations

Before deploying:

1. **Change JWT Secret**: Generate a new strong secret
2. **Update Database Credentials**: Use secure passwords
3. **Configure SMTP**: Set up real email service
4. **Enable HTTPS**: Use proper SSL certificates
5. **Audit Logs**: Review security logging
6. **Rate Limiting**: Implement API rate limits
7. **CORS Configuration**: Restrict to trusted domains

---

## Git Workflow

### .gitignore Coverage

The `.gitignore` files prevent committing:
- ✅ Node modules (`node_modules/`)
- ✅ Build artifacts (`target/`, `build/`, `.next/`)
- ✅ Environment secrets (`.env`, `*.key`)
- ✅ IDE configs (`.vscode/`, `.idea/`)
- ✅ OS files (`Thumbs.db`, `.DS_Store`)
- ✅ Logs (`*.log`)

### Safe to Commit
- Source code (`.ts`, `.tsx`, `.java`)
- Configuration (`pom.xml`, `package.json`, `next.config.ts`)
- Documentation (`.md`)
- Public assets (`public/`)
- CircomZK circuits (`*.circom`)

### Commit Changes
```bash
# Check what's tracked
git status

# Stage changes
git add .

# Commit
git commit -m "Your message"

# Push
git push origin main
```

---

## Additional Resources

- **Backend API Docs**: See `BACKEND_ENDPOINTS.md`
- **ZK Circuit**: See `zkp/README-ZKP.md`
- **Project Status**: See `PROJECT_STATUS.md`

---

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review `BACKEND_ENDPOINTS.md` for API details
3. Check browser console (F12) for frontend errors
4. Check terminal output for backend logs

---

**Last Updated**: 2026-03-26  
**Status**: ✅ Ready for Development
