/* GenericModel.js */
// Cambiamos 'db' por '{ pool }' para desestructurar el objeto que exporta db.js
const { pool: db } = require('../db'); 

const BD = {
  // Ahora 'db.query' sí funcionará porque 'db' es el promisePool
  async findAll(table) {
    const [rows] = await db.query(`SELECT * FROM ??`, [table]);
    return rows;
  },

  async findBy(table, column, value) {
    const [rows] = await db.query(`SELECT * FROM ?? WHERE ?? = ?`, [table, column, value]);
    return rows;
  },

  async create(table, data) {
    const [result] = await db.query(`INSERT INTO ?? SET ?`, [table, data]);
    return { id: result.insertId, ...data };
  },

  // ... (tus otros métodos se mantienen igual, ahora db.query será válido)

  async searchFuzzy(table, searchColumn, userInput) {
    const words = userInput.toLowerCase().replace(/[^\w\s]/gi, '').split(/\s+/).filter(w => w.length > 2);
    if (words.length === 0) return [];
    const booleanQuery = words.map(word => `${word}*`).join(' ');

    const sql = `SELECT *, MATCH(??) AGAINST(? IN BOOLEAN MODE) AS score FROM ?? 
                 WHERE MATCH(??) AGAINST(? IN BOOLEAN MODE) > 0 ORDER BY score DESC LIMIT 5`;
    
    // Aquí es donde tronaba, ahora funcionará:
    const [rows] = await db.query(sql, [searchColumn, booleanQuery, table, searchColumn, booleanQuery]);
    return rows;
  },

  async rawQuery(query, params = []) {
    const [rows] = await db.query(query, params);
    return rows;
  }
};

module.exports = BD;