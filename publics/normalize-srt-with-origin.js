const fs = require('fs');
const path = require('path');

// === CONFIG
const srtFolder = './transcripts';
const originFolder = './origin-transcripts';
const outputFolder = './normalized-transcripts';
if (!fs.existsSync(outputFolder)) fs.mkdirSync(outputFolder);

// === HELPERS
function timeStringToSeconds(str) {
  const [h, m, rest] = str.split(':');
  const [s, ms] = rest.split(',');
  return parseInt(h) * 3600 + parseInt(m) * 60 + parseInt(s) + parseInt(ms) / 1000;
}

function parseSrt(srtContent) {
  return srtContent
    .replace(/\r\n/g, '\n')
    .split('\n\n')
    .map(block => {
      const lines = block.split('\n').filter(Boolean);
      if (lines.length < 3) return null;
      const [startStr, endStr] = lines[1].split(' --> ');
      return {
        start: timeStringToSeconds(startStr.trim()),
        end: timeStringToSeconds(endStr.trim()),
        text: lines.slice(2).join(' ').trim(),
      };
    })
    .filter(Boolean);
}

function normalizeText(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s]|_/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function fuzzyMatch(text, originList, usedIndices) {
  const input = normalizeText(text);
  let bestScore = 0;
  let bestIndex = -1;

  for (let i = 0; i < originList.length; i++) {
    if (usedIndices.has(i)) continue;
    const target = normalizeText(originList[i].text);
    const score = simpleRatio(input, target);
    if (score > bestScore) {
      bestScore = score;
      bestIndex = i;
    }
  }

  return bestScore >= 50 ? bestIndex : null;
}

function simpleRatio(a, b) {
  const shorter = a.length < b.length ? a : b;
  const longer = a.length >= b.length ? a : b;
  if (longer.length === 0) return 0;
  return longer.includes(shorter) ? (shorter.length / longer.length) * 100 : 0;
}

// === MAIN
fs.readdirSync(srtFolder).forEach(file => {
  if (!file.endsWith('.srt')) return;

  const base = file.replace('.srt', '');
  const srtPath = path.join(srtFolder, file);
  const originPath = path.join(originFolder, `${base}.json`);
  const outputPath = path.join(outputFolder, `${base}.json`);

  if (!fs.existsSync(originPath)) {
    console.warn(`⚠️ Missing origin: ${file}`);
    return;
  }

  const srtData = parseSrt(fs.readFileSync(srtPath, 'utf-8'));
  const originData = JSON.parse(fs.readFileSync(originPath, 'utf-8'));

  const used = new Set();
  const result = srtData.map(segment => {
    const matchIdx = fuzzyMatch(segment.text, originData, used);
    let text = segment.text;
    let speaker = null;

    if (matchIdx !== null) {
      text = originData[matchIdx].text;
      speaker = originData[matchIdx].speaker;
      used.add(matchIdx);
    }

    return {
      start: segment.start,
      end: segment.end,
      text,
      speaker,
    };
  });

  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf-8');
  console.log(`✅ Processed: ${file}`);
});
