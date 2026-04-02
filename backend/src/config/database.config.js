const { Sequelize } = require('sequelize');

const normalizeHost = (host) => {
  if (!host) {
    return 'localhost';
  }

  const trimmedHost = host.trim();

  if (trimmedHost.startsWith('[') && trimmedHost.endsWith(']')) {
    return trimmedHost.slice(1, -1);
  }

  return trimmedHost;
};

const parseFamily = (family) => {
  if (!family) {
    return undefined;
  }

  const parsedFamily = Number(family);
  return parsedFamily === 4 || parsedFamily === 6 ? parsedFamily : undefined;
};

const host = normalizeHost(process.env.DB_HOST);
const family = parseFamily(process.env.DB_FAMILY);

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host,
    port: Number(process.env.DB_PORT || 3306),
    dialect: 'mysql',
    logging: false,
    dialectOptions: {
      ...(family ? { family } : {})
    }
  }
);

module.exports = sequelize;
