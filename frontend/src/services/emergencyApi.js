
import apiClient from './api';

const ARRAY_ITEMS = {
  incidents: 'incident',
  hazardTags: 'tag',
  responseUnits: 'unit',
  blockedRoads: 'road',
};

const NUMBER_FIELDS = new Set([
  'activeIncidents',
  'criticalIncidents',
  'highPriorityIncidents',
  'totalCasualties',
  'blockedRoads',
  'totalSegments',
  'blockedSegments',
  'priorityLevel',
  'latitude',
  'longitude',
  'distance',
  'distanceMeters',
  'etaMinutes',
  'casualties',
  'processingTimeMs',
]);

function parseXmlElement(element) {
  const children = Array.from(element.children);

  // Empty facility/node elements represent missing data.
  if (children.length === 0) {
    const text = element.textContent.trim();

    if (text === '') {
      return null;
    }

    if (NUMBER_FIELDS.has(element.tagName)) {
      const number = Number(text);
      return Number.isFinite(number) ? number : null;
    }

    return text;
  }

  const result = {};

  for (const child of children) {
    const key = child.tagName;
    const value = parseXmlElement(child);

    if (Object.prototype.hasOwnProperty.call(ARRAY_ITEMS, key)) {
      result[key] = value;
      continue;
    }

    if (Object.prototype.hasOwnProperty.call(result, key)) {
      if (!Array.isArray(result[key])) {
        result[key] = [result[key]];
      }

      result[key].push(value);
    } else {
      result[key] = value;
    }
  }

  // Convert known XML collections into JavaScript arrays.
  for (const [key, itemName] of Object.entries(ARRAY_ITEMS)) {
    const collection = children.find(
      child => child.tagName === key
    );

    if (!collection) {
      continue;
    }

    result[key] = Array.from(collection.children)
      .filter(child => child.tagName === itemName)
      .map(parseXmlElement);
  }

  return result;
}

function parseEmergencyXml(xmlText) {
  const parser = new DOMParser();
  const document = parser.parseFromString(
    xmlText,
    'application/xml'
  );

  if (
    document.querySelector('parsererror') ||
    document.documentElement.tagName !== 'emergencyIntelligence'
  ) {
    throw new Error('The emergency XML report is invalid.');
  }

  const data = parseXmlElement(document.documentElement);

  if (
    !data ||
    !data.summary ||
    !Array.isArray(data.incidents)
  ) {
    throw new Error(
      'The XML report is missing required emergency data.'
    );
  }

  // Match the response structure used by the existing dashboard.
  return {
    success: true,
    data,
  };
}

export const emergencyApi = {
  /**
   * Fetches XML and parses it for the Emergency Command Center.
   * The dashboard now consumes the XML report as its data source.
   */
  async getIntelligence() {
    const response = await apiClient.get(
      '/emergency/intelligence.xml',
      {
        responseType: 'text',
      }
    );

    return parseEmergencyXml(response.data);
  },

  /**
   * Downloads the original XML report.
   */
  async downloadXmlReport() {
    const response = await apiClient.get(
      '/emergency/intelligence.xml',
      {
        responseType: 'blob',
      }
    );

    const blob = new Blob([response.data], {
      type: 'application/xml;charset=utf-8',
    });

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = `emergency-report-${new Date()
      .toISOString()
      .replace(/[:.]/g, '-')}.xml`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    window.setTimeout(() => {
      window.URL.revokeObjectURL(url);
    }, 1000);
  },
};

export default emergencyApi;
