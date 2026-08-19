const fs = require('fs');

const content = fs.readFileSync('C:\\MFM-APD\\services\\emailService.js', 'utf8');

// Add the import for templateRenderer after the logger import
const importIndex = content.indexOf("const logger = require('../utils/logger');");
const withImport = content.substring(0, importIndex + 38) + 
"\nconst { renderInviteEmail, renderPasswordResetEmail } = require('../utils/templateRenderer');" + 
content.substring(importIndex + 38);

// Replace the buildInviteHtml function
const start = withImport.indexOf('function buildInviteHtml({');
const end = withImport.indexOf('\n}\n\n/**', start) + 2;
const before = withImport.substring(0, start);
const after = withImport.substring(end);
const newFunc = "function buildInviteHtml({\n  name,\n  link,\n}) {\n  return renderInviteEmail({ name, link });\n}";
const final = before + newFunc + '\n' + withImport.substring(end);

fs.writeFileSync('C:\\MFM-APD\\services\\emailService.js', final);
console.log('Done');