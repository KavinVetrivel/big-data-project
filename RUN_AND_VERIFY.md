# Run & Verification Guide

This guide walks through step-by-step execution and verification of the PSG College OpenStreetMap + Neo4j implementation.

---

## 1. Environment & Database Setup

### Step 1.1: Ensure Neo4j Docker Container is Running
From the `backend` directory:
```powershell
cd c:\vscode\big-data-project\backend
docker compose up -d
```
Check running container:
```powershell
docker ps --filter "name=campus-neo4j"
```

### Step 1.2: Check Configuration (`backend/.env`)
Ensure `backend/.env` exists and contains:
```env
NEO4J_URI=bolt://localhost:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=password123
NEO4J_DATABASE=neo4j
PORT=5000

OSM_OVERPASS_URL=https://overpass-api.de/api/interpreter

# Coordinates around PSG College of Technology & Peelamedu
OSM_SOUTH=11.0170
OSM_WEST=76.9980
OSM_NORTH=11.0290
OSM_EAST=77.0110
```

---

## 2. Command-Line Execution Order

Run the following commands from `c:\vscode\big-data-project\backend`:

### Command 1: Test Overpass API Retrieval (Dry-Run)
```powershell
npm run test:osm
```
**Expected Output:**
- Prints configured bounding box coordinates.
- Successfully queries Overpass API.
- Displays summary:
  * Total OSM elements (~2,228)
  * Highway elements (~221)
  * Building elements (~2,003)
  * Hospitals (3: PSG Hospitals, PSG Hospital Blood Bank, Joseph Hospital)
  * Police Stations (1: Peelamedu E2 Police Station)
  * Sample JSON for highway and building.
- Confirms: `No data has been inserted into Neo4j`.

### Command 2: Import OSM Data into Neo4j
```powershell
npm run import:osm
```
**Expected Output:**
- Verifies uniqueness constraints (`RoadNode.osmId`, `Building.osmId`, `Facility.osmId`) and spatial point indexes.
- Fetches OSM data via Overpass (with automatic mirror fallback if busy).
- Parses into nodes and road segments.
- Batch-inserts with `UNWIND` and `MERGE`:
  * ~1,103 RoadNodes
  * ~1,189 RoadSegments (`CONNECTED_TO`)
  * ~2,003 Buildings
  * 4 Facilities
- Spatial linking:
  * Links 2,003 Buildings to nearest RoadNodes via `[:NEAR { distance }]`.
  * Links 4 Facilities to nearest RoadNodes via `[:NEAR { distance }]`.
- Execution time: ~5 to 15 seconds.

### Command 3: Start the Express Server
```powershell
npm start
```
Starts server on `http://localhost:5000`.

---

## 3. Verifying Express API Endpoints

In another terminal or browser, test the endpoints:

### Test 1: Neo4j Connection Test
```powershell
curl http://localhost:5000/api/neo4j/test
```
*Response:*
```json
{
  "success": true,
  "message": "Successfully connected to Neo4j database.",
  "server": {
    "address": "localhost:7687",
    "agent": "Neo4j/2026.08.1"
  }
}
```

### Test 2: Graph Summary Status
```powershell
curl http://localhost:5000/api/osm/status
```
*Response:*
```json
{
  "success": true,
  "data": {
    "roadNodes": 1103,
    "buildings": 2003,
    "facilities": 4,
    "connectedTo": 2085
  }
}
```

### Test 3: Emergency Facilities
```powershell
curl http://localhost:5000/api/neo4j/facilities
```
*Response returns:*
- `PSG Hospitals` (connected to `rn_11.0194745_77.0072132`, distance 71.5m)
- `PSG Hospital Blood Bank` (connected to `rn_11.0179259_77.0068069`, distance 65.1m)
- `Peelamedu E2 Police Station` (connected to `rn_11.0250803_77.0100702`, distance 33.2m)
- `Joseph Hospital, Coimbatore` (connected to `rn_11.0174578_76.9992837`, distance 35.3m)

### Test 4: Nearest Facility to PSG College of Technology
Query coordinates `(11.0248, 77.0029)`:
```powershell
curl "http://localhost:5000/api/neo4j/nearest-facility?lat=11.0248&lon=77.0029"
```
*Response:*
```json
{
  "success": true,
  "data": {
    "name": "Peelamedu E2 Police Station",
    "facilityType": "police",
    "distanceMeters": 796.11
  }
}
```

### Test 5: Shortest Route Query
Compute shortest route between two RoadNodes:
```powershell
curl "http://localhost:5000/api/neo4j/route?from=rn_11.0174578_76.9992837&to=rn_11.0194745_77.0072132"
```
*Response:*
```json
{
  "success": true,
  "data": {
    "startNodeId": "rn_11.0174578_76.9992837",
    "endNodeId": "rn_11.0194745_77.0072132",
    "hops": 21,
    "totalDistanceMeters": 1092.45,
    "pathNodes": [ ... ],
    "segments": [ ... ]
  }
}
```

### Test 6: Emergency Road Blocking Simulation
Simulate a road closure on way `501125920`:
```powershell
Invoke-RestMethod -Uri "http://localhost:5000/api/neo4j/roads/block" -Method POST -ContentType "application/json" -Body '{"osmWayId": "501125920", "blocked": true}'
```
*Response:*
```json
{
  "success": true,
  "message": "Updated road segment 501125920. Blocked status: true",
  "updatedRelationships": 2
}
```

---

## 4. Five Key Cypher Queries for Neo4j Browser

Open **[http://localhost:7474](http://localhost:7474)** (Username: `neo4j`, Password: `password123`).

### Query 1: Total Entity Distribution
```cypher
MATCH (n)
RETURN labels(n)[0] AS EntityType, count(n) AS TotalCount;
```

### Query 2: Inspect Road Network Segments with Names and Types
```cypher
MATCH (a:RoadNode)-[r:CONNECTED_TO]->(b:RoadNode)
WHERE r.name IS NOT NULL
RETURN a.osmId, r.name, r.highwayType, r.distance, b.osmId
LIMIT 25;
```

### Query 3: Find Nearest Hospital to a Specific Campus Location
```cypher
WITH point({ latitude: 11.0248, longitude: 77.0029 }) AS campusCenter
MATCH (f:Facility { facilityType: 'hospital' })
RETURN f.name AS Hospital,
       point.distance(campusCenter, f.location) AS DistanceMeters,
       f.latitude, f.longitude
ORDER BY DistanceMeters ASC;
```

### Query 4: Safe Route Finding (Excluding Blocked Segments)
```cypher
MATCH (start:RoadNode { osmId: 'rn_11.0174578_76.9992837' }),
      (dest:RoadNode { osmId: 'rn_11.0194745_77.0072132' })
MATCH p = shortestPath((start)-[:CONNECTED_TO*..25]->(dest))
WHERE ALL(r IN relationships(p) WHERE coalesce(r.blocked, false) = false)
RETURN p,
       length(p) AS Hops,
       reduce(d = 0.0, r IN relationships(p) | d + r.distance) AS TotalMeters;
```

### Query 5: Find All Campus Buildings Connected to a Given Road
```cypher
MATCH (b:Building)-[r:NEAR]->(rn:RoadNode)
WHERE b.name IS NOT NULL
RETURN b.name AS Building, b.buildingType AS Type, r.distance AS DistanceToRoad, rn.osmId
ORDER BY r.distance ASC
LIMIT 20;
```

---

## 5. Safe Graph Cleanup

To wipe imported OSM data without altering other application data:
```powershell
npm run clear:osm
```
All RoadNodes, Buildings, Facilities, and relationships will be cleared safely.
