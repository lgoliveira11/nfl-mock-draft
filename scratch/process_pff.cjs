const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const bigboardPath = path.join(__dirname, '..', 'src', 'data', 'bigboard.json');
const bigboard = JSON.parse(fs.readFileSync(bigboardPath, 'utf8'));

const normalize = (name) => {
    if (!name) return '';
    return name.toLowerCase()
        .replace(/\./g, '')
        .replace(/-/g, ' ')
        .replace(/\sjr$/i, '')
        .replace(/\siii$/i, '')
        .replace(/\sii$/i, '')
        .replace(/\s/g, '')
        .trim();
};

const bigboardMap = new Map();
bigboard.forEach(p => {
    const norm = normalize(p.name);
    bigboardMap.set(norm, p);
});

try {
    const workbook = XLSX.readFile('C:\\Z\\NFL\\Big Board-PFF.xlsx');
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    const pffBoard = data.map(item => {
        const pffName = item['Jogador'];
        const normPff = normalize(pffName);
        const match = bigboardMap.get(normPff);

        if (match) {
            return {
                id: match.id,
                rank: parseInt(item['Rank']),
                name: match.name,
                position: match.position,
                pffGrade: item['Nota']
            };
        } else {
            return {
                id: null,
                rank: parseInt(item['Rank']),
                name: pffName,
                position: item['Posição'],
                pffGrade: item['Nota'],
                isNew: true
            };
        }
    });

    fs.writeFileSync(path.join(__dirname, '..', 'src', 'data', 'pff_board.json'), JSON.stringify(pffBoard, null, 2));
    console.log(`Successfully created pff_board.json with ${pffBoard.length} players.`);
    
    const unmatched = pffBoard.filter(p => !p.id);
    console.log(`Unmatched players count: ${unmatched.length}`);
} catch (error) {
    console.error('Error processing board:', error);
}
