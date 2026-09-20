# PSG College Emergency Response & Safe-Route Network

A high-performance geographic graph network application built for **PSG College of Technology**, Peelamedu, Coimbatore. The system integrates OpenStreetMap (OSM) data retrieved through the Overpass API into Neo4j, enabling graph-based road routing, emergency facility navigation, and safe evacuation pathfinding.

---

## OSM → Neo4j Pipeline

```
  +-------------------------------------------------------+
  |              OpenStreetMap (OSM) Crowd                |
  |     Global geospatial database of roads & polygons    |
  +-------------------------------------------------------+
                             |
                             v
  +-------------------------------------------------------+
  |                     Overpass API                      |
  |       Read-only QL endpoint filtering bounding box    |
  +-------------------------------------------------------+
                             |
                             v
  +-------------------------------------------------------+
  |               Node.js / Express Backend               |
  |   axios client + coordinate rounding + deduplication  |
  +-------------------------------------------------------+
                             |
                             v
  +-------------------------------------------------------+
  |               Batched Neo4j Importer                  |
  |   UNWIND transactions, MERGE, spatial point indexes   |
  +-------------------------------------------------------+
                             |
                             v
  +-------------------------------------------------------+
  |              Neo4j Labeled Property Graph             |
  |  (:RoadNode), (:Building), (:Facility), CONNECTED_TO  |
  +-------------------------------------------------------+
```

---

## Architectural Rationale

### 1. Why OpenStreetMap (OSM)?
- **Open and Free Data**: Provides open-source vector map data with fine-grained tags for roads, footpaths, building polygons, and emergency facilities without restrictive API paywalls.
- **Micro-level detail**: Captures college campus service roads, pedestrian paths, building outlines, and local amenities that commercial maps often generalize or hide.

### 2. Why the Overpass API?
- **Surgical Geographic Bounding**: Allows requesting only the exact bounding box around PSG College of Technology and surrounding Peelamedu emergency services, eliminating the need to download or process entire gigabyte city/state map files.
- **On-the-fly Geometry Extraction**: Using `out body geom;` yields polygon centroid coordinates and consecutive road segments directly in clean JSON.

### 3. Why Neo4j?
- **Native Graph Traversal**: Relational databases require complex recursive SQL joins to compute multi-hop routes. Neo4j executes pointer-hopping traversal (`shortestPath`) across thousands of nodes in milliseconds.
- **Built-in Spatial Calculations**: Neo4j's native `point({latitude, longitude})` and `point.distance()` allow finding nearest road nodes to campus buildings and facilities directly within the database engine.
- **Dynamic Edge Properties for Simulation**: The `CONNECTED_TO` relationship supports dynamic simulation properties such as `blocked: true`, allowing emergency evacuation routes to instantly bypass flooded roads, fire zones, or debris without altering database schema.

---

## Graph Schema

```
       (:Building)
            |
         [:NEAR { distance: <meters> }]
            |
            v
       (:RoadNode) <--- [:CONNECTED_TO { osmWayId, name, highwayType, distance, blocked, oneway }] ---> (:RoadNode)
            ^
            |
         [:NEAR { distance: <meters> }]
            |
       (:Facility)
```

### Node Labels & Properties
1. **`RoadNode`** (represents intersections and curve geometry points):
   - `osmId` (String, unique): Deterministic coordinate key (e.g., `rn_11.0267129_76.9904481`).
   - `latitude` (Float): WGS84 latitude.
   - `longitude` (Float): WGS84 longitude.
   - `location` (Point): Neo4j 2D WGS-84 Point for spatial indexing and distance calculation.
   - `source` (String): `'OSM'`.

2. **`Building`** (represents campus blocks, schools, malls, and halls):
   - `osmId` (String, unique): OSM Way ID.
   - `name` (String | null): Building name if tagged in OSM (e.g., `"PSG Public School"`, `"Fun republic Mall"`).
   - `buildingType` (String): OSM building category (`"school"`, `"commercial"`, `"yes"`, etc.).
   - `latitude` / `longitude` (Float): Centroid coordinate.
   - `location` (Point): Neo4j spatial point.

3. **`Facility`** (represents emergency infrastructure):
   - `osmId` (String, unique): OSM Node/Way ID.
   - `name` (String): Facility name (e.g., `"PSG Hospitals"`, `"Peelamedu E2 Police Station"`).
   - `facilityType` (String): `"hospital"`, `"fire_station"`, or `"police"`.
   - `latitude` / `longitude` (Float): Coordinate.
   - `location` (Point): Neo4j spatial point.

### Relationship Types & Properties
1. **`[:CONNECTED_TO]`** (between consecutive `RoadNode`s):
   - `osmWayId` (String): Parent OSM road ID.
   - `name` (String | null): Road name (e.g., `"Avinashi Road"`, `"Vilankurichi Road"`).
   - `highwayType` (String): OSM road class (`"primary"`, `"secondary"`, `"residential"`, `"service"`, `"footway"`).
   - `distance` (Float): Physical segment length in meters.
   - `blocked` (Boolean, default `false`): Used for emergency route rerouting.
   - `emergencyOnly` (Boolean, default `false`): For specialized emergency corridors.
   - `oneway` (Boolean): Directionality flag.

2. **`[:NEAR]`** (links `Building` or `Facility` to the nearest `RoadNode`):
   - `distance` (Float): Straight-line distance in meters to the road network entrance.

---

## Getting Started

### Prerequisites
- [Docker Desktop](https://www.docker.com/) (running)
- [Node.js](https://nodejs.org/) (v18+ recommended)
- `npm` (bundled with Node.js)

### 1. Start Neo4j Database
Navigate to the `backend` folder and start the Docker container:
```bash
cd backend
docker compose up -d
```
Verify the container is healthy:
- Neo4j Browser: [http://localhost:7474](http://localhost:7474)
- Bolt Protocol: `bolt://localhost:7687`
- Username: `neo4j`
- Password: `password123`

### 2. Configure Environment Variables
Verify or edit `backend/.env`:
```env
NEO4J_URI=bolt://localhost:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=password123
NEO4J_DATABASE=neo4j
PORT=5000

OSM_OVERPASS_URL=https://overpass-api.de/api/interpreter

# PSG College of Technology & Peelamedu Bounding Box
OSM_SOUTH=11.0170
OSM_WEST=76.9980
OSM_NORTH=11.0290
OSM_EAST=77.0110
```

### 3. Test OpenStreetMap Overpass Retrieval (Dry Run)
Test fetching data from Overpass without modifying Neo4j:
```bash
npm run test:osm
```

### 4. Import OSM Data into Neo4j
Execute the batched import pipeline:
```bash
npm run import:osm
```

### 5. Start the Express API Server
```bash
npm start
```
The server will start at `http://localhost:5000`.

---

## API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/neo4j/test` | Verifies active Neo4j connectivity and server version |
| `GET` | `/api/osm/status` | Returns counts of RoadNodes, Buildings, Facilities, and CONNECTED_TO relationships |
| `GET` | `/api/neo4j/roads?limit=50` | Returns a sample of RoadNodes with coordinates |
| `GET` | `/api/neo4j/facilities` | Returns all emergency facilities with their nearest road connections |
| `GET` | `/api/neo4j/buildings?limit=50` | Returns campus buildings with coordinates and nearest road links |
| `GET` | `/api/neo4j/route?from=<id>&to=<id>&avoidBlocked=true` | Computes the shortest path avoiding blocked road segments |
| `GET` | `/api/neo4j/nearest-facility?lat=<lat>&lon=<lon>&type=<type>` | Finds the nearest hospital, police, or fire station to any coordinate |
| `POST` | `/api/neo4j/roads/block` | Simulates an emergency by setting `{ osmWayId, blocked: true/false }` |

---

## Verification Cypher Queries (Neo4j Browser)

Open [http://localhost:7474](http://localhost:7474) and run:

1. **Verify Graph Node Label Counts**:
   ```cypher
   MATCH (n)
   RETURN labels(n) AS Label, count(n) AS Count;
   ```

2. **Inspect Emergency Facilities and Nearest Roads**:
   ```cypher
   MATCH (f:Facility)-[r:NEAR]->(rn:RoadNode)
   RETURN f.name, f.facilityType, r.distance, rn.osmId;
   ```

3. **Find Nearest Hospital to PSG Tech Campus (11.0248, 77.0029)**:
   ```cypher
   WITH point({ latitude: 11.0248, longitude: 77.0029 }) AS psgTech
   MATCH (f:Facility { facilityType: 'hospital' })
   RETURN f.name, f.facilityType, point.distance(psgTech, f.location) AS distanceMeters
   ORDER BY distanceMeters ASC
   LIMIT 1;
   ```

4. **Find Shortest Route Between Two Road Nodes (Excluding Blocked Segments)**:
   ```cypher
   MATCH (start:RoadNode { osmId: 'rn_11.0174578_76.9992837' }),
         (dest:RoadNode { osmId: 'rn_11.0194745_77.0072132' })
   MATCH p = shortestPath((start)-[:CONNECTED_TO*..25]->(dest))
   WHERE ALL(r IN relationships(p) WHERE coalesce(r.blocked, false) = false)
   RETURN p, length(p) AS hops;
   ```

5. **Simulate Blocking a Road Segment**:
   ```cypher
   // Block a road segment
   MATCH ()-[r:CONNECTED_TO { osmWayId: '501125920' }]->()
   SET r.blocked = true;

   // Verify blocked segments
   MATCH ()-[r:CONNECTED_TO { blocked: true }]->()
   RETURN count(r) AS blockedSegments;

   // Unblock when emergency clears
   MATCH ()-[r:CONNECTED_TO { osmWayId: '501125920' }]->()
   SET r.blocked = false;
   ```

---

## Safe Cleanup
To safely clear only OSM graph data without dropping constraints or other tables:
```bash
npm run clear:osm
```


## Run the application
# Terminal 1: Backend (if not running)
cd backend && npm start

# Terminal 2: Frontend
cd frontend && npm run dev
