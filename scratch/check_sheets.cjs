const XLSX = require('xlsx');
const fs = require('fs');

try {
    const workbook = XLSX.readFile('C:\\Z\\NFL\\Big Board-PFF.xlsx');
    console.log('Sheets in workbook:', workbook.SheetNames);
} catch (error) {
    console.error('Error reading Excel file:', error.message);
}
