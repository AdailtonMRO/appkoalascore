const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'public');
const destDir = path.join(__dirname, 'dist');

if (!fs.existsSync(srcDir)) {
  console.log('Source directory (public) does not exist.');
  process.exit(0);
}

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

function copyFolderSync(from, to) {
  if (!fs.existsSync(to)) {
    fs.mkdirSync(to);
  }
  fs.readdirSync(from).forEach((element) => {
    const stat = fs.lstatSync(path.join(from, element));
    if (stat.isFile()) {
      fs.copyFileSync(path.join(from, element), path.join(to, element));
      console.log(`Copied: ${element}`);
    } else if (stat.isDirectory()) {
      copyFolderSync(path.join(from, element), path.join(to, element));
    }
  });
}

try {
  copyFolderSync(srcDir, destDir);
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
