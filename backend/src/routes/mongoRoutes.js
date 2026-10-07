const express = require('express');
const router = express.Router();
const Incident = require('../models/Incident');
const { getMongoStatus } = require('../config/mongo');
const { seedMongoDB } = require('../scripts/seedMongo');

// Auto-reconnect middleware if not already connected
router.use(async (req, res, next) => {
  if (getMongoStatus().connected) {
    return next();
  }
  try {
    const { connectMongoDB } = require('../config/mongo');
    await connectMongoDB();
  } catch (err) {
    console.warn('[MongoDB Middleware] Auto-connect attempt:', err.message);
  }
  next();
});

/**
 * Health / Connection Test
 * GET /api/mongo/status
 */
router.get('/status', async (req, res) => {
  try {
    const status = getMongoStatus();
    const count = status.connected ? await Incident.countDocuments() : 0;
    res.json({
      success: true,
      status: status.connected ? 'connected' : 'disconnected',
      details: status,
      totalIncidents: count
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Seed Endpoint
 * POST /api/mongo/seed
 */
router.post('/seed', async (req, res) => {
  try {
    await seedMongoDB();
    const count = await Incident.countDocuments();
    res.json({
      success: true,
      message: `Successfully seeded MongoDB collection 'incidents' with sample campus incidents.`,
      count
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Slide 38, 56: Projection & Basic Find
 * GET /api/mongo/query/projection
 * Cypher/Mongo equivalent: db.incidents.find({}, { incidentId: 1, title: 1, severity: 1, building: 1, _id: 0 })
 */
router.get('/query/projection', async (req, res) => {
  try {
    const t0 = Date.now();
    const data = await Incident.find({}, { incidentId: 1, title: 1, severity: 1, building: 1, _id: 0 }).lean();
    res.json({
      queryDescription: "Projection: Display only specific fields ({ incidentId: 1, title: 1, severity: 1, building: 1, _id: 0 })",
      mongoCommand: "db.incidents.find({}, { incidentId: 1, title: 1, severity: 1, building: 1, _id: 0 })",
      executionTimeMs: Date.now() - t0,
      count: data.length,
      data
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Slide 39: Comparison Operators ($gte, $lt, $ne)
 * GET /api/mongo/query/comparison?minPriority=4
 * Cypher/Mongo equivalent: db.incidents.find({ priorityLevel: { $gte: 4 } })
 */
router.get('/query/comparison', async (req, res) => {
  try {
    const minPriority = parseInt(req.query.minPriority || '4', 10);
    const t0 = Date.now();
    const data = await Incident.find({ priorityLevel: { $gte: minPriority } }).lean();
    res.json({
      queryDescription: `Comparison: Find high-priority incidents where priorityLevel >= ${minPriority} ($gte operator)`,
      mongoCommand: `db.incidents.find({ priorityLevel: { $gte: ${minPriority} } })`,
      executionTimeMs: Date.now() - t0,
      count: data.length,
      data
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Slide 40: AND Condition ($and)
 * GET /api/mongo/query/and
 * Cypher/Mongo equivalent: db.incidents.find({ $and: [ { severity: "Critical" }, { status: "Active" } ] })
 */
router.get('/query/and', async (req, res) => {
  try {
    const t0 = Date.now();
    const filter = {
      $and: [
        { severity: "Critical" },
        { status: "Active" }
      ]
    };
    const data = await Incident.find(filter).lean();
    res.json({
      queryDescription: "AND Operator: Find active incidents that are critically urgent ($and)",
      mongoCommand: 'db.incidents.find({ $and: [ { severity: "Critical" }, { status: "Active" } ] })',
      executionTimeMs: Date.now() - t0,
      count: data.length,
      data
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Slide 41: OR Condition ($or)
 * GET /api/mongo/query/or
 * Cypher/Mongo equivalent: db.incidents.find({ $or: [ { type: "Fire" }, { type: "Chemical Hazard" } ] })
 */
router.get('/query/or', async (req, res) => {
  try {
    const t0 = Date.now();
    const filter = {
      $or: [
        { type: "Fire" },
        { type: "Chemical Hazard" }
      ]
    };
    const data = await Incident.find(filter).lean();
    res.json({
      queryDescription: "OR Operator: Find incidents of hazard category Fire OR Chemical Hazard ($or)",
      mongoCommand: 'db.incidents.find({ $or: [ { type: "Fire" }, { type: "Chemical Hazard" } ] })',
      executionTimeMs: Date.now() - t0,
      count: data.length,
      data
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Slide 42, 43: Dot Notation on Nested Subdocuments
 * GET /api/mongo/query/nested?zone=North Campus
 * Cypher/Mongo equivalent: db.incidents.find({ "location.zone": "North Campus" })
 */
router.get('/query/nested', async (req, res) => {
  try {
    const zone = req.query.zone || 'North Campus';
    const t0 = Date.now();
    const data = await Incident.find({ "location.zone": zone }).lean();
    res.json({
      queryDescription: `Dot Notation on Nested Document: Find incidents located in "${zone}" via "location.zone"`,
      mongoCommand: `db.incidents.find({ "location.zone": "${zone}" })`,
      executionTimeMs: Date.now() - t0,
      count: data.length,
      data
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Slide 45: Query an Array using $all
 * GET /api/mongo/query/array-all
 * Cypher/Mongo equivalent: db.incidents.find({ hazardTags: { $all: ["chemical", "evacuate"] } })
 */
router.get('/query/array-all', async (req, res) => {
  try {
    const t0 = Date.now();
    const tags = ['chemical', 'evacuate'];
    const data = await Incident.find({ hazardTags: { $all: tags } }).lean();
    res.json({
      queryDescription: "Array Query with $all: Find incidents containing BOTH tags ['chemical', 'evacuate']",
      mongoCommand: `db.incidents.find({ hazardTags: { $all: ["chemical", "evacuate"] } })`,
      executionTimeMs: Date.now() - t0,
      count: data.length,
      data
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Slide 47, 50: Array Subdocuments with $elemMatch
 * GET /api/mongo/query/elem-match
 * Cypher/Mongo equivalent: db.incidents.find({ responseUnits: { $elemMatch: { status: "En Route", etaMinutes: { $lte: 5 } } } })
 */
router.get('/query/elem-match', async (req, res) => {
  try {
    const t0 = Date.now();
    const filter = {
      responseUnits: {
        $elemMatch: {
          status: "En Route",
          etaMinutes: { $lte: 5 }
        }
      }
    };
    const data = await Incident.find(filter).lean();
    res.json({
      queryDescription: "$elemMatch Operator: Match incidents where an assigned response unit has status 'En Route' and etaMinutes <= 5",
      mongoCommand: 'db.incidents.find({ responseUnits: { $elemMatch: { status: "En Route", etaMinutes: { $lte: 5 } } } })',
      executionTimeMs: Date.now() - t0,
      count: data.length,
      data
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Slide 48: Array by Length ($size)
 * GET /api/mongo/query/array-size?size=3
 * Cypher/Mongo equivalent: db.incidents.find({ hazardTags: { $size: 3 } })
 */
router.get('/query/array-size', async (req, res) => {
  try {
    const size = parseInt(req.query.size || '3', 10);
    const t0 = Date.now();
    const data = await Incident.find({ hazardTags: { $size: size } }).lean();
    res.json({
      queryDescription: `Array $size Operator: Find incidents where hazardTags array has exactly ${size} elements`,
      mongoCommand: `db.incidents.find({ hazardTags: { $size: ${size} } })`,
      executionTimeMs: Date.now() - t0,
      count: data.length,
      data
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Slide 57, 58, 59, 60: Pagination & Sorting (.sort(), .skip(), .limit())
 * GET /api/mongo/query/sort-pagination?page=1&limit=3&sortField=priorityLevel&order=-1
 * Cypher/Mongo equivalent: db.incidents.find().sort({ priorityLevel: -1 }).skip(0).limit(3)
 */
router.get('/query/sort-pagination', async (req, res) => {
  try {
    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '3', 10);
    const skip = (page - 1) * limit;
    const sortField = req.query.sortField || 'priorityLevel';
    const order = parseInt(req.query.order || '-1', 10);

    const t0 = Date.now();
    const sortObj = { [sortField]: order };
    const data = await Incident.find().sort(sortObj).skip(skip).limit(limit).lean();
    const total = await Incident.countDocuments();

    res.json({
      queryDescription: `Sorting and Pagination: Sort by ${sortField} (${order === 1 ? 'Ascending' : 'Descending'}), skip ${skip}, limit ${limit}`,
      mongoCommand: `db.incidents.find().sort({ ${sortField}: ${order} }).skip(${skip}).limit(${limit})`,
      executionTimeMs: Date.now() - t0,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      count: data.length,
      data
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Slide 61, 62, 63, 67: Aggregation Pipeline ($group, $match, $sum, $avg)
 * GET /api/mongo/query/aggregation
 * Cypher/Mongo equivalent:
 * db.incidents.aggregate([
 *   { $group: { _id: "$type", count: { $sum: 1 }, avgPriority: { $avg: "$priorityLevel" }, totalCasualties: { $sum: "$casualties" } } },
 *   { $sort: { count: -1 } }
 * ])
 */
router.get('/query/aggregation', async (req, res) => {
  try {
    const t0 = Date.now();
    const pipeline = [
      {
        $group: {
          _id: "$type",
          count: { $sum: 1 },
          avgPriority: { $avg: "$priorityLevel" },
          totalCasualties: { $sum: "$casualties" }
        }
      },
      {
        $sort: { count: -1 }
      }
    ];

    const results = await Incident.aggregate(pipeline);
    res.json({
      queryDescription: "Aggregation Pipeline: Group by incident type with $sum counts, $avg priorityLevel, and $sort (Slides 61-63)",
      mongoCommand: 'db.incidents.aggregate([\n  { $group: { _id: "$type", count: { $sum: 1 }, avgPriority: { $avg: "$priorityLevel" }, totalCasualties: { $sum: "$casualties" } } },\n  { $sort: { count: -1 } }\n])',
      executionTimeMs: Date.now() - t0,
      count: results.length,
      data: results
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Slide 63: Aggregation Pipeline with $match + $group + $project
 * GET /api/mongo/query/agg-match-project
 */
router.get('/query/agg-match-project', async (req, res) => {
  try {
    const t0 = Date.now();
    const pipeline = [
      { $match: { status: "Active" } },
      {
        $group: {
          _id: "$location.zone",
          activeCount: { $sum: 1 },
          maxPriority: { $max: "$priorityLevel" },
          totalCasualties: { $sum: "$casualties" }
        }
      },
      {
        $project: {
          _id: 0,
          campusZone: "$_id",
          activeCount: 1,
          maxPriority: 1,
          totalCasualties: 1,
          requiresImmediateEvacuation: { $gt: ["$totalCasualties", 0] }
        }
      },
      { $sort: { activeCount: -1 } }
    ];

    const results = await Incident.aggregate(pipeline);
    res.json({
      queryDescription: "Aggregation with $match, $group and $project: Filter active incidents, group by campus zone, compute statistics, project custom fields (Slide 63)",
      mongoCommand: 'db.incidents.aggregate([\n  { $match: { status: "Active" } },\n  { $group: { _id: "$location.zone", activeCount: { $sum: 1 }, maxPriority: { $max: "$priorityLevel" }, totalCasualties: { $sum: "$casualties" } } },\n  { $project: { _id: 0, campusZone: "$_id", activeCount: 1, maxPriority: 1, totalCasualties: 1, requiresImmediateEvacuation: { $gt: ["$totalCasualties", 0] } } },\n  { $sort: { activeCount: -1 } }\n])',
      executionTimeMs: Date.now() - t0,
      count: results.length,
      data: results
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Slide 51, 52: Update ($set, updateOne)
 * POST /api/mongo/incidents/:id/status
 */
router.patch('/incidents/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const t0 = Date.now();
    const result = await Incident.updateOne(
      { incidentId: id },
      { $set: { status, updatedAt: new Date() } }
    );
    res.json({
      queryDescription: `Update Document: Update status of incident ${id} using $set`,
      mongoCommand: `db.incidents.updateOne({ incidentId: "${id}" }, { $set: { status: "${status}" } })`,
      executionTimeMs: Date.now() - t0,
      result
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Slide 54, 55: Delete (deleteOne)
 * DELETE /api/mongo/incidents/:id
 */
router.delete('/incidents/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const t0 = Date.now();
    const result = await Incident.deleteOne({ incidentId: id });
    res.json({
      queryDescription: `Delete Document: Remove incident ${id} with deleteOne`,
      mongoCommand: `db.incidents.deleteOne({ incidentId: "${id}" })`,
      executionTimeMs: Date.now() - t0,
      result
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
