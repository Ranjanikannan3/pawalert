const fs = require('fs');
const path = require('path');
const { marked } = require('./server/node_modules/marked');

const mdPath = path.resolve(__dirname, 'PAWALERT_PROJECT_REPORT.md');
const htmlPath = path.resolve(__dirname, 'PAWALERT_PROJECT_REPORT.html');

console.log('Reading Markdown:', mdPath);
const md = fs.readFileSync(mdPath, 'utf8');

// Configure marked options
marked.setOptions({
  gfm: true,
  breaks: true,
});

const bodyContent = marked(md);

const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>PawAlert AI - OHS352 Project Report</title>
  <style>
    @page {
      size: A4;
      margin: 25mm 20mm 25mm 20mm;
      @bottom-right {
        content: counter(page);
      }
    }
    
    body {
      font-family: 'Times New Roman', Times, serif, 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      font-size: 12pt;
      line-height: 1.6;
      color: #111827;
      background-color: #ffffff;
      margin: 0;
      padding: 0;
    }

    h1, h2, h3, h4, h5, h6 {
      font-family: 'Times New Roman', Georgia, serif;
      color: #0f172a;
      font-weight: bold;
      page-break-after: avoid;
    }

    h1 {
      font-size: 20pt;
      text-align: center;
      margin-top: 24pt;
      margin-bottom: 18pt;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 8pt;
    }

    h2 {
      font-size: 16pt;
      margin-top: 20pt;
      margin-bottom: 12pt;
      border-bottom: 1px solid #cbd5e1;
      padding-bottom: 4pt;
    }

    h3 {
      font-size: 14pt;
      margin-top: 16pt;
      margin-bottom: 8pt;
    }

    h4 {
      font-size: 12pt;
      margin-top: 12pt;
      margin-bottom: 6pt;
    }

    p {
      margin-bottom: 10pt;
      text-align: justify;
      text-justify: inter-word;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin: 14pt 0;
      font-size: 10pt;
      page-break-inside: avoid;
    }

    th, td {
      border: 1px solid #94a3b8;
      padding: 6pt 8pt;
      text-align: left;
      vertical-align: top;
    }

    th {
      background-color: #f1f5f9;
      color: #0f172a;
      font-weight: bold;
    }

    tr:nth-child(even) {
      background-color: #f8fafc;
    }

    pre, code {
      font-family: 'Courier New', Courier, monospace;
      font-size: 9.5pt;
    }

    pre {
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      border-left: 3px solid #3b82f6;
      padding: 10pt;
      border-radius: 4px;
      overflow-x: auto;
      page-break-inside: avoid;
      white-space: pre-wrap;
      word-wrap: break-word;
    }

    code {
      background-color: #f1f5f9;
      padding: 2pt 4pt;
      border-radius: 3px;
      color: #0f172a;
    }

    blockquote {
      margin: 12pt 0;
      padding-left: 12pt;
      border-left: 4px solid #64748b;
      color: #334155;
      font-style: italic;
    }

    ul, ol {
      margin-top: 4pt;
      margin-bottom: 12pt;
      padding-left: 20pt;
    }

    li {
      margin-bottom: 4pt;
      text-align: justify;
    }

    hr {
      border: 0;
      border-top: 1px solid #e2e8f0;
      margin: 20pt 0;
    }

    /* Page breaks for chapters */
    h1 {
      page-break-before: always;
    }
    
    /* Cover page exception */
    body > h1:first-of-type {
      page-break-before: avoid;
    }

    .cover-box {
      border: 2px solid #0f172a;
      padding: 25pt;
      text-align: center;
      margin-bottom: 30pt;
    }
  </style>
</head>
<body>
  ${bodyContent}
</body>
</html>`;

fs.writeFileSync(htmlPath, fullHtml, 'utf8');
console.log('✅ HTML successfully written to:', htmlPath);
