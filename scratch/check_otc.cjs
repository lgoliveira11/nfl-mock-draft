const XLSX = require('xlsx');
const fs = require('fs');

try {
    const workbook = XLSX.readFile('C:\\Z\\NFL\\Big Board-OTC.xlsx');
    console.log('Sheets in OTC workbook:', workbook.SheetNames);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet);
    console.log('First 5 rows of OTC:', JSON.stringify(data.slice(0, 5), null, 2));
} catch (error) {
    console.error('Error reading OTC Excel:', error.message);
}
