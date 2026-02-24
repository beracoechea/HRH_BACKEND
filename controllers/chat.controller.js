const BD = require('../models/GenericModel');
const Fuse = require('fuse.js');

exports.getChatResponse = async (req, res) => {
    // 🛡️ Extraemos y limpiamos la entrada inmediatamente
    let { q } = req.query;
    
    if (!q) return res.status(400).json({ answer: "Dime algo para poder ayudarte." });

    // 1. LIMITACIÓN Y SANITIZACIÓN:
    // Cortamos a 50 caracteres y eliminamos etiquetas HTML/Scripts
    q = q.toString().substring(0, 50).replace(/<[^>]*>?/gm, '').trim();

    try {
        // 2. Búsqueda rápida en DB (Full-Text Search)
        let results = await BD.searchFuzzy('chatbot_knowledge', 'keywords', q);

        // 3. Fallback con Fuse.js
        if (!results || results.length === 0) {
            const allKnowledge = await BD.findAll('chatbot_knowledge');
            
            const fuse = new Fuse(allKnowledge, {
                keys: ['keywords'],
                threshold: 0.4
            });

            const fuseResult = fuse.search(q);
            if (fuseResult.length > 0) {
                return res.json({ answer: fuseResult[0].item.answer });
            }
        } else {
            // Si la DB encontró algo con MATCH AGAINST
            return res.json({ answer: results[0].answer });
        }

        // 4. Respuesta por defecto si nada coincidió
        res.json({ 
            answer: "No estoy seguro de entenderte, ¿podrías intentar con palabras como 'requisitos' o 'horarios'?" 
        });

    } catch (err) {
        console.error("Chat Error:", err);
        // Pentesting Tip: No enviamos el error real al cliente para no dar pistas del sistema
        res.status(500).json({ answer: "Tuve un pequeño error técnico, intenta de nuevo." });
    }
};