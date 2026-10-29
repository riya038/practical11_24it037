# Practical 11: Containerization with Docker and Docker Compose

**Course:** Advanced Web Development Frameworks (ITUE301)  
**Program:** B.Tech (IT / CE / CSE / AIML) — CHAROTAR UNIVERSITY OF SCIENCE AND TECHNOLOGY (CHARUSAT)  
**Author:** 24IT037  
**Course Outcomes:** CO5 / PO3, PO5  

---

## 📌 Objectives

1. Containerize the full-stack Task Management application (React frontend, Node/Express backend, and MongoDB database) using Docker.
2. Write production-ready `Dockerfile` configurations for both backend and frontend services.
3. Orchestrate multi-container services using `docker-compose.yml` on a unified user-defined bridge network (`app-network`).
4. Establish inter-container communication using Docker internal DNS (referencing `mongodb` service name instead of `localhost`).
5. Guarantee complete stack execution with a single command: `docker-compose up --build`.
6. Implement **Supplementary Problems**:
   - Exclude `node_modules` and `.env` via `.dockerignore` to streamline build context.
   - Utilize multi-stage build in frontend Dockerfile.
   - Attach a persistent named volume (`mongo-data`) to MongoDB to retain data across container restarts.

---

## 🏗️ Architecture & Network Flow

### Multi-Container Stack Diagram

```text
docker-compose.yml
 ├── frontend (React + Vite Preview, Port 5173:5173)
 ├── backend  (Node/Express API, Port 5000:5000)
 └── mongodb  (Official MongoDB Image, Port 27017:27017, Volume: mongo-data)

Network: app-network (Bridge)
 ┌──────────────┐         ┌──────────────┐         ┌──────────────┐
 │   frontend   │ ──────► │   backend    │ ──────► │   mongodb    │
 │ (port 5173)  │         │ (port 5000)  │         │ (port 27017) │
 └──────────────┘         └──────────────┘         └──────────────┘
```

### Docker Network & Host Access Architecture (Mermaid)

```mermaid
graph TD
    subgraph Host Machine (Browser & User)
        Browser["Host Browser (http://localhost:5173)"]
        HostAPI["API Client (http://localhost:5000)"]
    end

    subgraph Docker Engine: user-defined bridge (app-network)
        subgraph Frontend Container: taskflow-frontend
            Vite["React Preview Server (Port 5173)"]
        end

        subgraph Backend Container: taskflow-backend
            Express["Express Server (Port 5000)"]
        end

        subgraph MongoDB Container: taskflow-mongodb
            MongoEngine["MongoDB Daemon (Port 27017)"]
            NamedVol[("Named Volume: mongo-data")]
            MongoEngine --- NamedVol
        end
    end

    Browser -->|Host Port 5173:5173| Vite
    HostAPI -->|Host Port 5000:5000| Express
    Vite -. Client AJAX Requests .-> Express
    Express -->|Internal DNS: mongodb:27017| MongoEngine
```

---

## 📋 Docker Desktop Pre-Flight Checklist (Crucial)

Before running any Docker commands, verify your host environment:

### Step 0.1: Ensure Docker Desktop is Running
1. Open **Docker Desktop** from the Windows Start Menu.
2. Wait until the whale icon in the Windows Taskbar (System Tray) becomes steady.
3. In Docker Desktop, the bottom-left corner should display a green badge with **"Engine running"**.

### Step 0.2: Verify Docker and Docker Compose CLI
Open PowerShell or Command Prompt in the project folder and run:
```powershell
docker --version
docker compose version
```
*Expected output:*
- `Docker version 24.x.x` (or newer)
- `Docker Compose version v2.x.x` (or newer)

### Step 0.3: Avoid Host Port Conflicts
Docker Compose binds host ports `5173`, `5000`, and `27017`. Ensure no local instances are already running:
- **Local MongoDB Service:** If you have MongoDB installed as a local Windows service, stop it before starting Docker:
  ```powershell
  net stop MongoDB
  ```
- **Local Node.js Dev Servers:** Terminate any running `npm run dev` in backend or frontend terminals.

---

## 🛠️ Configuration & Implementation

### 1. Backend Dockerfile (`backend/Dockerfile`)
```dockerfile
FROM node:18

WORKDIR /app

# Copy package manifests first to leverage Docker layer caching
COPY package*.json ./
RUN npm install

# Copy application source code
COPY . .

EXPOSE 5000

CMD ["node", "server.js"]
```

### 2. Frontend Dockerfile (`frontend/Dockerfile`)
```dockerfile
# Multi-stage build for React Vite frontend (Practical 11)
FROM node:18 AS build

WORKDIR /app

# Copy package manifests first to leverage Docker layer caching
COPY package*.json ./
RUN npm install

# Build production bundle
COPY . .
RUN npm run build

EXPOSE 5173

# Serve production preview accessible on all interfaces
CMD ["npm", "run", "preview", "--", "--host", "--port", "5173"]
```

### 3. Build Optimization with `.dockerignore`
Both `backend/.dockerignore` and `frontend/.dockerignore` exclude bulky host dependencies and environment files:
```text
node_modules
dist
npm-debug.log
.env
.git
.gitignore
```

### 4. Docker Compose Orchestration (`docker-compose.yml`)
```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:latest
    container_name: taskflow-mongodb
    restart: always
    ports:
      - "27017:27017"
    volumes:
      - mongo-data:/data/db
    networks:
      - app-network

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: taskflow-backend
    restart: always
    ports:
      - "5000:5000"
    environment:
      - PORT=5000
      - MONGO_URI=mongodb://mongodb:27017/taskdb
      - JWT_SECRET=super_secret_jwt_key_practical11_itue301_charusat_24it037
      - JWT_EXPIRES_IN=1h
    depends_on:
      - mongodb
    networks:
      - app-network

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: taskflow-frontend
    restart: always
    ports:
      - "5173:5173"
    environment:
      - VITE_API_URL=http://localhost:5000
    depends_on:
      - backend
    networks:
      - app-network

volumes:
  mongo-data:
    driver: local

networks:
  app-network:
    driver: bridge
```

---

## 🚀 Running the Stack Step-by-Step

### 1. Build and Launch Containers
In the project root directory, run:
```powershell
docker-compose up --build
```
*(Or run in detached background mode using `docker-compose up --build -d`)*

### 2. Verify Container Health
Check active containers in a new terminal window:
```powershell
docker ps
```
You should see all 3 containers active:
- `taskflow-frontend` (Port `0.0.0.0:5173->5173/tcp`)
- `taskflow-backend` (Port `0.0.0.0:5000->5000/tcp`)
- `taskflow-mongodb` (Port `0.0.0.0:27017->27017/tcp`)

### 3. Access the Application
- **Frontend App:** Open [http://localhost:5173](http://localhost:5173) in your browser.
- **Backend API Documentation:** Open [http://localhost:5000](http://localhost:5000).
- **Cache Stats Endpoint:** [http://localhost:5000/cache/stats](http://localhost:5000/cache/stats).

### 4. Stop the Stack
To shut down containers gracefully:
```powershell
docker-compose down
```
To stop and remove containers including the persistent volume:
```powershell
docker-compose down -v
```

---

## 💡 Key Analysis & Viva Questions

### Q1: Why does the backend container need to reference the MongoDB container by its service name (`mongodb`) rather than `localhost`?
> **Answer:**  
> In Docker, each container operates within its own isolated network namespace with its own dedicated loopback interface (`localhost` / `127.0.0.1`). If the backend process requests `localhost:27017`, it looks for MongoDB inside the *backend container itself*, where no database server is running.  
> When containers are attached to a user-defined bridge network (`app-network`), Docker Compose injects an embedded DNS server (at `127.0.0.11`) that automatically resolves service names defined in `docker-compose.yml` (e.g., `mongodb`) to the actual internal container IP address assigned on that virtual bridge.

### Q2: What is the difference between `EXPOSE` in a Dockerfile and the `ports` mapping in `docker-compose.yml`?
> **Answer:**  
> - **`EXPOSE` (Dockerfile):** Functions as documentation and metadata. It declares which port the containerized process listens on inside the container network, but it does **not** publish or bind that port to the host machine.
> - **`ports` (docker-compose.yml):** Defines an active NAT port forwarding rule (e.g. `"5000:5000"`) on the host machine. It binds the specified port on the host operating system to the container port, making the container service accessible from outside Docker (such as from a host web browser).

### Q3: Why is it considered bad practice to copy `node_modules` into a Docker image instead of running `npm install` inside the container?
> **Answer:**  
> 1. **Binary Architecture Incompatibilities:** Many npm packages (e.g., `bcrypt`, native bindings) compile platform-dependent C/C++ binaries. If compiled on Windows x64 host, they will crash inside the Linux container.
> 2. **Build Context Bloat & Slowness:** `node_modules` typically contains tens of thousands of files. Transferring them into the Docker daemon daemon build context dramatically slows down every build step.
> 3. **Clean & Reproducible Builds:** Executing `npm install` within the target container OS guarantees clean, reproducible dependencies aligned with the containerized runtime environment.

---

## 🔍 Troubleshooting Guide

| Symptom | Likely Cause | Verified Solution |
| :--- | :--- | :--- |
| **Backend cannot connect to MongoDB** | Connection string uses `localhost` or `127.0.0.1` instead of the Compose service name. | Ensure `MONGO_URI` is set to `mongodb://mongodb:27017/taskdb` in `docker-compose.yml`. |
| **Port already in use error** | A previous container or local process (e.g., local MongoDB service or Node server) is already bound to port 27017, 5000, or 5173. | Stop local services (`net stop MongoDB`) or run `docker ps` and stop conflicting containers using `docker stop <id>`. |
| **Build is extremely slow** | Host `node_modules` is being copied into the build context. | Add a `.dockerignore` file containing `node_modules` in both backend and frontend directories. |
| **Changes to code not reflected after rebuild** | Old image layers are cached. | Force a fresh build by executing: `docker-compose up --build`. |

---

## 📦 Deliverables Checklist

- [x] Backend `Dockerfile` configured with Node 18 runtime.
- [x] Frontend `Dockerfile` configured with multi-stage build and Vite preview.
- [x] `.dockerignore` files created for both backend and frontend.
- [x] `docker-compose.yml` orchestrating frontend, backend, and MongoDB.
- [x] Named volume `mongo-data` attached for MongoDB persistence.
- [x] Dedicated bridge network `app-network` configured for inter-container communication.
- [x] Backend database URI updated to `mongodb://mongodb:27017/taskdb`.
- [x] Single-command execution verified (`docker-compose up --build`).
