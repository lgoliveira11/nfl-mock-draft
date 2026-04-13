const XLSX = require('xlsx');
const fs = require('fs');

try {
    const workbook = XLSX.readFile('C:\\Z\\NFL\\Big Board-PFF.xlsx');
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    console.log(JSON.stringify(data.slice(0, 10), null, 2));
} catch (error) {
    console.error('Error reading Excel file:', error.message);
}
