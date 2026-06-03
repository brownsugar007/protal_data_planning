import { formatNumber } from './src/lib/utils/format.js';

console.log(formatNumber('66.550', 3));
console.log(formatNumber(66.550, 3));
console.log(formatNumber('66550.000', 3));
console.log(formatNumber(66550, 3));
