const BD = require('../models/GenericModel');
const Fuse = require('fuse.js');

exports.getChatResponse = async (req, res) => {
    let { q } = req.query;
    
    if (!q) return res.status(400).json({ answer: "Dime algo para poder ayudarte." });

    q = q.toString().substring(0, 50).replace(/<[^>]*>?/gm, '').trim();

    try {
        let results = await BD.searchFuzzy('chatbot_knowledge', 'keywords', q);

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
            return res.json({ answer: results[0].answer });
        }

        res.json({ 
            answer: "No estoy seguro de entenderte, ¿podrías intentar con palabras como 'requisitos' o 'horarios'?" 
        });

    } catch (err) {
        console.error("Chat Error:", err);
        res.status(500).json({ answer: "Tuve un pequeño error técnico, intenta de nuevo." });
    }
};