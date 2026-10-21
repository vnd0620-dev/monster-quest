// 체험판(demo.html)을 claude.ai 아티팩트용 한 페이지로 바꿉니다: doctype/html/head/body 태그만 벗겨 냅니다.
const fs = require('fs'), path = require('path');
const src = fs.readFileSync(path.join(__dirname, '../public/demo.html'), 'utf8');
const out = src.replace(/<!doctype html>\s*/i, '').replace(/<\/?html[^>]*>\s*/gi, '').replace(/<\/?head>\s*/gi, '').replace(/<\/?body>\s*/gi, '')
  .replace(/<meta charset[^>]*>\s*/i, '').replace(/<meta name="viewport"[^>]*>\s*/i, '');
fs.mkdirSync(path.join(__dirname, '../dist'), { recursive: true });
fs.writeFileSync(path.join(__dirname, '../dist/demo-artifact.html'), out);
console.log('dist/demo-artifact.html', out.length, 'bytes');
