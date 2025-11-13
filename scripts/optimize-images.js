const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Configuration
const IMAGES_DIR = path.join(__dirname, '..', 'assets', 'images');
const THRESHOLD_BYTES = 150 * 1024; // convert images larger than 150 KB
const MAX_WIDTH = 1920; // resize images wider than this
const QUALITY = 80; // webp quality

function walk(dir){
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for(const e of entries){
    const full = path.join(dir, e.name);
    if (e.isDirectory()) files.push(...walk(full));
    else files.push(full);
  }
  return files;
}

(async function main(){
  console.log('Scanning images in', IMAGES_DIR);
  const files = walk(IMAGES_DIR).filter(f => /\.(png|jpg|jpeg)$/i.test(f));
  const converted = new Set();
  for(const f of files){
    try{
      const stat = fs.statSync(f);
      if (stat.size < THRESHOLD_BYTES){
        // skip small files
        continue;
      }
      const rel = path.relative(IMAGES_DIR, f);
      const parsed = path.parse(f);
      const outFile = path.join(parsed.dir, parsed.name + '.webp');
      // load with sharp, optionally resize
      let img = sharp(f);
      const metadata = await img.metadata();
      if (metadata.width && metadata.width > MAX_WIDTH){
        img = img.resize({ width: MAX_WIDTH });
      }
      await img.webp({ quality: QUALITY }).toFile(outFile);
      converted.add(rel.replace(/\\/g, '/'));
      console.log('Converted:', rel, '->', path.relative(IMAGES_DIR, outFile));
    }catch(err){
      console.warn('Failed to convert', f, err.message);
    }
  }

  if (converted.size === 0){
    console.log('No images converted (none above threshold).');
    return;
  }

  // Update references in project files (.json, .js, .html)
  const projectRoot = path.join(__dirname, '..');
  const exts = ['.json', '.js', '.html', '.css'];
  function walkFiles(dir){
    const ents = fs.readdirSync(dir, { withFileTypes: true });
    const out = [];
    for(const e of ents){
      const full = path.join(dir, e.name);
      if (e.isDirectory()){
        if (['node_modules', '.git', 'vendor'].includes(e.name)) continue;
        out.push(...walkFiles(full));
      } else {
        if (exts.includes(path.extname(e.name).toLowerCase())) out.push(full);
      }
    }
    return out;
  }

  const textFiles = walkFiles(projectRoot);
  console.log('Updating references in', textFiles.length, 'files...');
  const conversions = Array.from(converted).map(p => ({ from: p, to: p.replace(/\.(png|jpg|jpeg)$/i, '.webp') }));

  for(const tf of textFiles){
    try{
      let content = fs.readFileSync(tf, 'utf8');
      let changed = false;
      for(const c of conversions){
        // replace occurrences of the filename (both quoted and unquoted)
        const re = new RegExp(c.from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
        if (re.test(content)){
          content = content.replace(re, c.to);
          changed = true;
        }
      }
      if (changed){
        fs.writeFileSync(tf, content, 'utf8');
        console.log('Updated references in', path.relative(projectRoot, tf));
      }
    }catch(err){
      console.warn('Failed to update', tf, err.message);
    }
  }

  console.log('Image optimization finished. Converted files:', converted.size);
})();
