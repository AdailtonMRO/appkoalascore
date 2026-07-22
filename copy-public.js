const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'public');
const destDir = path.join(__dirname, 'dist');

if (!fs.existsSync(srcDir)) {
  console.log('Source directory (public) does not exist.');
  process.exit(0);
}

try {
  fs.cpSync(srcDir, destDir, { recursive: true });
  console.log('Successfully copied PWA public files to dist.');

  // Inject AdSense script tag statically in index.html for site verification
  const htmlPath = path.join(destDir, 'index.html');
  if (fs.existsSync(htmlPath)) {
    let html = fs.readFileSync(htmlPath, 'utf8');
    const adSenseScript = '<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9278504866264813" crossorigin="anonymous"></script>';
    if (!html.includes('pagead2.googlesyndication.com')) {
      html = html.replace('</head>', `  ${adSenseScript}\n</head>`);
      fs.writeFileSync(htmlPath, html, 'utf8');
      console.log('Injected Google AdSense verification script tag into index.html');
    }
  }
} catch (err) {
  console.error('Error copying files:', err);
  process.exit(1);
}
