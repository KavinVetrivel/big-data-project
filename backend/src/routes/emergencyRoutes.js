
const express = require('express');

const router = express.Router();

const {
  getEmergencyIntelligence
} = require('../services/emergencyIntelligenceService');

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

const arrayItemNames = {
  incidents: 'incident',
  hazardTags: 'tag',
  responseUnits: 'unit',
  blockedRoads: 'road'
};

function objectToXml(value, nodeName) {
  // Handle missing values without inventing data.
  if (value === null || value === undefined) {
    return `<${nodeName}/>`;
  }

  // FIX: Convert Date objects to ISO 8601 strings.
  // This must run before the generic object check.
  if (value instanceof Date) {
    const dateValue = Number.isNaN(value.getTime())
      ? ''
      : value.toISOString();

    return `<${nodeName}>${escapeXml(dateValue)}</${nodeName}>`;
  }

  if (Array.isArray(value)) {
    const itemName = arrayItemNames[nodeName] || 'item';

    return `<${nodeName}>${value
      .map(item => objectToXml(item, itemName))
      .join('')}</${nodeName}>`;
  }

  if (typeof value === 'object') {
    const children = Object.entries(value)
      .map(([key, childValue]) => objectToXml(childValue, key))
      .join('');

    return `<${nodeName}>${children}</${nodeName}>`;
  }

  return `<${nodeName}>${escapeXml(value)}</${nodeName}>`;
}

router.get('/intelligence', async (req, res) => {
  try {
    const intelligence = await getEmergencyIntelligence();

    res.json({
      success: true,
      data: intelligence
    });
  } catch (error) {
    console.error('[Emergency Intelligence] Error:', error);

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/intelligence.xml', async (req, res) => {
  try {
    const intelligence = await getEmergencyIntelligence();

    const xml =
      '<?xml version="1.0" encoding="UTF-8"?>' +
      objectToXml(intelligence, 'emergencyIntelligence');

    res
      .status(200)
      .type('application/xml')
      .send(xml);
  } catch (error) {
    console.error('[Emergency Intelligence XML] Error:', error);

    res
      .status(500)
      .type('application/xml')
      .send(
        '<?xml version="1.0" encoding="UTF-8"?>' +
        '<error>' +
        `<message>${escapeXml(error.message)}</message>` +
        '</error>'
      );
  }
});

module.exports = router;
