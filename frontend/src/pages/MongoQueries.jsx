import { useState, useEffect } from 'react';
import {
  Database, Play, RefreshCw, AlertTriangle, Filter,
  Code, Tag, CheckCircle2, SlidersHorizontal, Terminal,
  Copy, Check, Sparkles, BookOpen, Layers, BarChart2
} from 'lucide-react';
import apiClient from '../services/api';

const MONGO_COMMANDS_CATALOG = [
  // 1. Basic Find & Projection
  {
    id: 'projection',
    category: 'Projection & Find',
    slides: 'Slide 38 & 56',
    title: 'Basic Find with Field Projection',
    description: 'Retrieves all documents but selectively includes only specified fields (incidentId, title, severity, building) while explicitly suppressing the default _id field with 0.',
    whatItFinds: 'A lightweight summary list of all campus incidents with only core identifiers (ID, title, severity, building). This drastically reduces bandwidth and memory overhead by stripping out large nested objects, logs, and metadata.',
    mongoCommand: 'db.incidents.find(\n  {},\n  { incidentId: 1, title: 1, severity: 1, building: 1, _id: 0 }\n)',
    endpoint: '/mongo/query/projection',
    method: 'GET',
    explanation: 'Projection limits network payload by returning only the required keys. 1 includes a field, 0 hides it.'
  },

  // 2. Comparison Operators
  {
    id: 'comparison',
    category: 'Comparison Operators',
    slides: 'Slide 39',
    title: 'Numerical Comparison ($gte)',
    description: 'Queries incidents where priorityLevel is greater than or equal to 4 ($gte). Equivalent to SQL WHERE priorityLevel >= 4.',
    whatItFinds: 'All high-priority emergencies (priority levels 4 and 5). This helps dispatchers immediately isolate critical life-threatening situations that demand immediate intervention.',
    mongoCommand: 'db.incidents.find({\n  priorityLevel: { $gte: 4 }\n})',
    endpoint: '/mongo/query/comparison?minPriority=4',
    method: 'GET',
    explanation: 'MongoDB provides $gt, $gte, $lt, $lte, $ne, and $eq for numerical, date, or string comparisons.'
  },

  // 3. Logical AND Operator
  {
    id: 'and',
    category: 'Logical Operators',
    slides: 'Slide 40',
    title: 'Logical AND ($and)',
    description: 'Finds emergency incidents meeting multiple conditions simultaneously: severity must be "Critical" AND status must be "Active".',
    whatItFinds: 'Unresolved incidents that are currently active and classified as "Critical". This pinpoints urgent in-progress emergencies requiring real-time command center oversight.',
    mongoCommand: 'db.incidents.find({\n  $and: [\n    { severity: "Critical" },\n    { status: "Active" }\n  ]\n})',
    endpoint: '/mongo/query/and',
    method: 'GET',
    explanation: '$and takes an array of expression clauses and returns documents that satisfy every clause.'
  },

  // 4. Logical OR Operator
  {
    id: 'or',
    category: 'Logical Operators',
    slides: 'Slide 41',
    title: 'Logical OR ($or)',
    description: 'Matches documents where at least one condition holds true: hazard category is "Fire" OR "Chemical Hazard".',
    whatItFinds: 'Incidents requiring specialized hazardous material or firefighting teams (either "Fire" or "Chemical Hazard"). This assists dispatchers in dispatching hazardous material response units instead of standard security.',
    mongoCommand: 'db.incidents.find({\n  $or: [\n    { type: "Fire" },\n    { type: "Chemical Hazard" }\n  ]\n})',
    endpoint: '/mongo/query/or',
    method: 'GET',
    explanation: '$or takes an array of query clauses and returns documents matching any of them.'
  },

  // 5. Embedded / Dot Notation
  {
    id: 'nested',
    category: 'Nested Documents',
    slides: 'Slide 42 & 43',
    title: 'Dot Notation on Nested Document',
    description: 'Queries an embedded subdocument field location.zone = "North Campus" without needing SQL table joins.',
    whatItFinds: 'All incidents occurring specifically within the "North Campus" geographical zone. This enables campus security patrol units to isolate incidents restricted to their patrol beat.',
    mongoCommand: 'db.incidents.find({\n  "location.zone": "North Campus"\n})',
    endpoint: '/mongo/query/nested?zone=North Campus',
    method: 'GET',
    explanation: 'Dot notation enables direct querying of nested JSON sub-objects (location -> zone).'
  },

  // 6. Array Queries with $all
  {
    id: 'array-all',
    category: 'Array Operators',
    slides: 'Slide 45',
    title: 'Array Matching with $all',
    description: 'Matches documents where the hazardTags array contains both "chemical" and "evacuate" elements regardless of order or extra elements.',
    whatItFinds: 'Complex hazardous incidents tagged with BOTH "chemical" AND "evacuate". This identifies laboratory or chemical spills that have escalated to campus-wide evacuation protocols.',
    mongoCommand: 'db.incidents.find({\n  hazardTags: { $all: ["chemical", "evacuate"] }\n})',
    endpoint: '/mongo/query/array-all',
    method: 'GET',
    explanation: '$all ensures all specified values exist in the target array field.'
  },

  // 7. Array Subdocuments with $elemMatch
  {
    id: 'elem-match',
    category: 'Subdocument Arrays',
    slides: 'Slide 47 & 50',
    title: 'Array Elements Matching Multiple Criteria ($elemMatch)',
    description: 'Selects documents where at least one response unit in the responseUnits array has status "En Route" AND etaMinutes <= 5.',
    whatItFinds: 'Incidents where a response vehicle is currently speeding to the scene and is less than 5 minutes away. This helps commanders verify that rapid first responders are arriving on site.',
    mongoCommand: 'db.incidents.find({\n  responseUnits: {\n    $elemMatch: {\n      status: "En Route",\n      etaMinutes: { $lte: 5 }\n    }\n  }\n})',
    endpoint: '/mongo/query/elem-match',
    method: 'GET',
    explanation: '$elemMatch verifies that a single array element satisfies all criteria concurrently.'
  },

  // 8. Array by Exact Length ($size)
  {
    id: 'array-size',
    category: 'Array Operators',
    slides: 'Slide 48',
    title: 'Array Length Operator ($size)',
    description: 'Finds incident documents where the hazardTags array contains exactly 3 tags.',
    whatItFinds: 'Incidents labeled with exactly 3 hazard tags. This helps audit classification complexity and identify incidents categorized with detailed multi-factor hazard tagging.',
    mongoCommand: 'db.incidents.find({\n  hazardTags: { $size: 3 }\n})',
    endpoint: '/mongo/query/array-size?size=3',
    method: 'GET',
    explanation: '$size matches arrays containing the exact specified count of elements.'
  },

  // 9. Sorting, Skip & Limit (Pagination)
  {
    id: 'sort-pagination',
    category: 'Cursor Modifiers',
    slides: 'Slides 57 - 60',
    title: 'Sorting, Skip and Limit (Pagination)',
    description: 'Sorts incidents by priorityLevel in descending order (-1), skips the first 0 items, and limits results to 3 documents.',
    whatItFinds: 'The top 3 most severe incidents currently tracked, sorted strictly from highest priority to lowest. This is essential for incident dashboard feeds and triage rank-lists.',
    mongoCommand: 'db.incidents.find()\n  .sort({ priorityLevel: -1 })\n  .skip(0)\n  .limit(3)',
    endpoint: '/mongo/query/sort-pagination?page=1&limit=3&sortField=priorityLevel&order=-1',
    method: 'GET',
    explanation: '.sort(1 or -1) orders documents. .skip(n) bypasses records, and .limit(n) restricts output count.'
  },

  // 10. Aggregation Pipeline ($group, $sum, $avg, $sort)
  {
    id: 'aggregation-group',
    category: 'Aggregation Pipeline',
    slides: 'Slides 61, 62 & 67',
    title: 'Aggregation: $group with $sum and $avg',
    description: 'Multi-stage aggregation that groups incidents by hazard type, computes total incident count, average priority level, and total casualties.',
    whatItFinds: 'Statistical metrics grouped by hazard type—including incident counts, average severity, and total casualties. This helps campus safety leadership evaluate which hazard categories inflict the highest harm.',
    mongoCommand: 'db.incidents.aggregate([\n  {\n    $group: {\n      _id: "$type",\n      count: { $sum: 1 },\n      avgPriority: { $avg: "$priorityLevel" },\n      totalCasualties: { $sum: "$casualties" }\n    }\n  },\n  { $sort: { count: -1 } }\n])',
    endpoint: '/mongo/query/aggregation',
    method: 'GET',
    explanation: 'The aggregation framework processes documents through pipelines ($match, $group, $sort) similar to SQL GROUP BY with aggregate functions.'
  },

  // 11. Aggregation with $match + $group + $project
  {
    id: 'aggregation-project',
    category: 'Aggregation Pipeline',
    slides: 'Slide 63 & 67',
    title: 'Aggregation: $match, $group and $project',
    description: 'Filters for Active incidents ($match), groups by campus zone ($group), and reshapes output documents with computed fields ($project).',
    whatItFinds: 'Zone-by-zone emergency analysis for active cases, flagging whether immediate campus evacuation is needed based on casualties. This powers live campus crisis management decision maps.',
    mongoCommand: 'db.incidents.aggregate([\n  { $match: { status: "Active" } },\n  {\n    $group: {\n      _id: "$location.zone",\n      activeCount: { $sum: 1 },\n      maxPriority: { $max: "$priorityLevel" },\n      totalCasualties: { $sum: "$casualties" }\n    }\n  },\n  {\n    $project: {\n      _id: 0,\n      campusZone: "$_id",\n      activeCount: 1,\n      maxPriority: 1,\n      totalCasualties: 1,\n      requiresImmediateEvacuation: { $gt: ["$totalCasualties", 0] }\n    }\n  },\n  { $sort: { activeCount: -1 } }\n])',
    endpoint: '/mongo/query/agg-match-project',
    method: 'GET',
    explanation: '$match filters early, $group aggregates, and $project reshapes documents or computes boolean indicators.'
  }
];

export default function MongoQueries() {
  const [selectedCmd, setSelectedCmd] = useState(MONGO_COMMANDS_CATALOG[0]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState(null);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    fetchStatus();
    executeCommand(MONGO_COMMANDS_CATALOG[0]);
  }, []);

  const fetchStatus = async () => {
    try {
      const res = await apiClient.get('/mongo/status');
      setStatus(res.data);
    } catch {
      setStatus({ status: 'disconnected', details: { readyState: 0 } });
    }
  };

  const handleSeed = async () => {
    setSeeding(true);
    setError(null);
    try {
      await apiClient.post('/mongo/seed');
      await fetchStatus();
      executeCommand(selectedCmd);
    } catch (e) {
      setError(`Seeding failed: ${e.message}`);
    } finally {
      setSeeding(false);
    }
  };

  const executeCommand = async (cmd) => {
    setSelectedCmd(cmd);
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get(cmd.endpoint);
      setResult(res.data);
    } catch (e) {
      setError(`Execution failed: ${e.message}. Is MongoDB Atlas connected?`);
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ paddingBottom: 40 }}>
      {/* Top Header Card */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: 14,
        padding: '22px 26px',
        marginBottom: 24,
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              background: '#047857',
              color: '#ffffff',
              padding: 10,
              borderRadius: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 6px -1px rgba(4, 120, 87, 0.2)'
            }}>
              <Terminal size={24} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                MongoDB Query & Aggregation Console
              </h2>
              <p style={{ fontSize: '0.84rem', color: '#64748b', marginTop: 3 }}>
                Reference Document Database Queries & Pipelines • Connected to MongoDB Atlas Cluster
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: status?.status === 'connected' ? '#f0fdf4' : '#fef2f2',
              color: status?.status === 'connected' ? '#16a34a' : '#dc2626',
              border: `1px solid ${status?.status === 'connected' ? '#bbf7d0' : '#fecaca'}`,
              borderRadius: 20,
              padding: '6px 14px',
              fontSize: '0.8rem',
              fontWeight: 700
            }}>
              <span style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: status?.status === 'connected' ? '#16a34a' : '#dc2626'
              }} />
              {status?.status === 'connected' ? 'Atlas Connected' : 'Mongo Offline'}
            </div>

            <button
              onClick={handleSeed}
              disabled={seeding}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: '#4f46e5',
                color: '#ffffff',
                border: 'none',
                borderRadius: 8,
                padding: '8px 16px',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: seeding ? 'not-allowed' : 'pointer',
                opacity: seeding ? 0.7 : 1,
                boxShadow: '0 2px 4px rgba(79, 70, 229, 0.25)'
              }}
            >
              <RefreshCw size={14} className={seeding ? 'spin' : ''} />
              {seeding ? 'Seeding...' : 'Seed Collection'}
            </button>
          </div>
        </div>

        {/* Database & Collection Metadata Strip */}
        <div style={{
          marginTop: 16,
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: 8,
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 10,
          fontSize: '0.78rem',
          color: '#475569'
        }}>
          <div>
            <strong>Atlas URI:</strong>{' '}
            <code style={{ background: '#e2e8f0', padding: '2px 6px', borderRadius: 4, color: '#1e293b' }}>
              cluster0.mvmssrx.mongodb.net/campus_emergency
            </code>
          </div>
          <div style={{ display: 'flex', gap: 14 }}>
            <span>Database: <strong>campus_emergency</strong></span>
            <span>Collection: <strong>incidents</strong></span>
            <span>Total Documents: <strong>{status?.totalIncidents ?? 8}</strong></span>
          </div>
        </div>
      </div>

      {error && (
        <div style={{
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: 10,
          padding: '12px 16px',
          color: '#991b1b',
          fontSize: '0.85rem',
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}>
          <AlertTriangle size={16} />
          {error}
        </div>
      )}

      {/* Main 2-Column Layout: Left Menu of Commands, Right Query Playground */}
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 20, alignItems: 'start' }}>
        
        {/* Left Column: Command Directory */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: 12,
          padding: '16px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, paddingBottom: 10, borderBottom: '1px solid #f1f5f9' }}>
            <BookOpen size={16} style={{ color: '#4f46e5' }} />
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, margin: 0, color: '#1e293b' }}>
              Command Catalog
            </h3>
            <span style={{ marginLeft: 'auto', fontSize: '0.72rem', background: '#f1f5f9', padding: '2px 8px', borderRadius: 9999, fontWeight: 700, color: '#64748b' }}>
              {MONGO_COMMANDS_CATALOG.length} Queries
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: '680px', overflowY: 'auto', paddingRight: 4 }}>
            {MONGO_COMMANDS_CATALOG.map((cmd) => {
              const isSelected = selectedCmd.id === cmd.id;
              return (
                <div
                  key={cmd.id}
                  onClick={() => executeCommand(cmd)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 8,
                    cursor: 'pointer',
                    background: isSelected ? '#eff6ff' : 'transparent',
                    border: isSelected ? '1px solid #3b82f6' : '1px solid transparent',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      color: isSelected ? '#2563eb' : '#64748b',
                      textTransform: 'uppercase'
                    }}>
                      {cmd.category}
                    </span>
                    <span style={{ fontSize: '0.68rem', color: '#94a3b8', fontFamily: 'monospace' }}>
                      {cmd.slides}
                    </span>
                  </div>
                  <div style={{
                    fontSize: '0.82rem',
                    fontWeight: isSelected ? 700 : 600,
                    color: isSelected ? '#1e3a8a' : '#1e293b'
                  }}>
                    {cmd.title}
                  </div>
                  {cmd.whatItFinds && (
                    <div style={{
                      fontSize: '0.72rem',
                      color: isSelected ? '#1d4ed8' : '#64748b',
                      marginTop: 3,
                      lineHeight: 1.3,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}>
                      💡 {cmd.whatItFinds}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Execution Workbench & Projected Results */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          
          {/* Active Command Overview Card */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            padding: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{
                    background: '#f1f5f9',
                    color: '#334155',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 4
                  }}>
                    {selectedCmd.category}
                  </span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#6366f1' }}>
                    Reference: {selectedCmd.slides}
                  </span>
                </div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: '2px 0 6px 0' }}>
                  {selectedCmd.title}
                </h3>
                <p style={{ fontSize: '0.85rem', color: '#475569', margin: 0, lineHeight: 1.45 }}>
                  {selectedCmd.description}
                </p>
              </div>

              <button
                onClick={() => executeCommand(selectedCmd)}
                disabled={loading}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 16px',
                  borderRadius: 8,
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  border: 'none',
                  background: '#0284c7',
                  color: '#ffffff',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  flexShrink: 0
                }}
              >
                <Play size={14} fill="#ffffff" />
                {loading ? 'Executing...' : 'Run Query'}
              </button>
            </div>

            {/* What this query helps find */}
            {selectedCmd.whatItFinds && (
              <div style={{
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderLeft: '4px solid #16a34a',
                padding: '10px 14px',
                borderRadius: '0 8px 8px 0',
                fontSize: '0.82rem',
                color: '#166534',
                marginBottom: 10,
                display: 'flex',
                alignItems: 'flex-start',
                gap: 8,
                lineHeight: 1.45
              }}>
                <Sparkles size={16} style={{ color: '#16a34a', flexShrink: 0, marginTop: 2 }} />
                <div>
                  <strong style={{ color: '#14532d' }}>What this query returns & helps find: </strong>
                  <span>{selectedCmd.whatItFinds}</span>
                </div>
              </div>
            )}

            {/* Explanation box */}
            <div style={{
              background: '#f8fafc',
              borderLeft: '4px solid #3b82f6',
              padding: '8px 12px',
              borderRadius: '0 6px 6px 0',
              fontSize: '0.8rem',
              color: '#334155',
              marginBottom: 16
            }}>
              <strong>Concept Explanation:</strong> {selectedCmd.explanation}
            </div>

            {/* MongoDB Shell Command Code Block */}
            <div style={{ position: 'relative' }}>
              <div style={{
                background: '#0f172a',
                borderRadius: 8,
                padding: '14px 18px',
                fontFamily: 'Consolas, Monaco, monospace',
                fontSize: '0.84rem',
                color: '#38bdf8',
                overflowX: 'auto',
                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, borderBottom: '1px solid #1e293b', paddingBottom: 6 }}>
                  <span style={{ color: '#64748b', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    MongoDB Shell (mongosh)
                  </span>
                  <button
                    onClick={() => copyToClipboard(selectedCmd.mongoCommand)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: copied ? '#4ade80' : '#94a3b8',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: '0.72rem'
                    }}
                  >
                    {copied ? <Check size={12} /> : <Copy size={12} />}
                    {copied ? 'Copied' : 'Copy Query'}
                  </button>
                </div>
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap', color: '#f8fafc' }}>
                  <span style={{ color: '#38bdf8' }}>{selectedCmd.mongoCommand}</span>
                </pre>
              </div>

              {result && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: 8,
                  fontSize: '0.75rem',
                  color: '#64748b'
                }}>
                  <span style={{ color: '#16a34a', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <CheckCircle2 size={13} /> Query executed successfully
                  </span>
                  <span>
                    Benchmark: <strong>{result.executionTimeMs} ms</strong> • Returned: <strong>{result.count} documents</strong>
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Results Projection View */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            padding: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Layers size={16} style={{ color: '#0284c7' }} />
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
                  Projected Query Results (Live Output)
                </h4>
              </div>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                Format: Formatted JSON / Document Projection
              </span>
            </div>

            {/* Quick Summary of What These Results Reveal */}
            {selectedCmd.whatItFinds && !loading && result?.data && (
              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                padding: '8px 12px',
                marginBottom: 12,
                fontSize: '0.78rem',
                color: '#334155',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}>
                <Tag size={14} style={{ color: '#0284c7', flexShrink: 0 }} />
                <span>
                  <strong>Output Insight:</strong> {selectedCmd.whatItFinds}
                </span>
              </div>
            )}

            {loading ? (
              <div style={{ textAlign: 'center', padding: '50px 0', color: '#64748b' }}>
                <RefreshCw size={24} className="spin" style={{ color: '#0284c7', marginBottom: 8 }} />
                <p style={{ fontSize: '0.85rem', margin: 0 }}>Querying MongoDB Atlas...</p>
              </div>
            ) : !result?.data || result.data.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8', fontSize: '0.85rem' }}>
                No records returned. Please verify that the collection is seeded.
              </div>
            ) : (
              <div style={{
                background: '#090d16',
                borderRadius: 8,
                padding: '16px',
                overflowX: 'auto',
                maxHeight: '440px'
              }}>
                <pre style={{
                  color: '#e2e8f0',
                  fontFamily: 'Consolas, Monaco, monospace',
                  fontSize: '0.8rem',
                  margin: 0,
                  whiteSpace: 'pre-wrap'
                }}>
                  {JSON.stringify(result.data, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
