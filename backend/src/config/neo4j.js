const neo4j = require('neo4j-driver');
require('dotenv').config();

const uri = process.env.NEO4J_URI || 'bolt://localhost:7687';
const user = process.env.NEO4J_USERNAME || 'neo4j';
const password = process.env.NEO4J_PASSWORD || 'password123';
const database = process.env.NEO4J_DATABASE || 'neo4j';

const driver = neo4j.driver(
  uri,
  neo4j.auth.basic(user, password),
  {
    disableLosslessIntegers: true // automatically convert Neo4j integers to JS numbers
  }
);

/**
 * Returns a new Neo4j session for the configured database.
 */
function getSession(dbName = database) {
  return driver.session({ database: dbName });
}

/**
 * Gracefully close driver on application shutdown.
 */
async function closeDriver() {
  await driver.close();
}

module.exports = {
  driver,
  getSession,
  closeDriver,
  database
};
