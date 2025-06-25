const fs = require('fs');
const path = require('path');

// === CONFIG
const FILENAME = '220120_6min_english_gut_health_download copy'; // <-- đổi tên ở đây, ví dụ: '20240625'
const srtPath = path.join('transcripts', `${FILENAME}.srt`);
const originPath = path.join('origin-transcripts', `${FILENAME}.json`);
const outputPath = path.join('normalized-transcripts', `${FILENAME}.json`);
if (!fs.existsSync('normalized-transcripts'))
    fs.mkdirSync('normalized-transcripts');

// === HELPERS
function timeStringToSeconds(str) {
    const [h, m, rest] = str.split(':');
    const [s, ms] = rest.split(',');
    return (
        parseInt(h) * 3600 +
        parseInt(m) * 60 +
        parseInt(s) +
        parseInt(ms) / 1000
    );
}

function parseSrt(srtContent) {
    return srtContent
        .replace(/\r\n/g, '\n')
        .split('\n\n')
        .map((block) => {
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

function findBestOriginSegment(srtText, originList, usedIndices) {
    const input = normalizeText(srtText);
    let bestMatch = null;

    for (let i = 0; i < originList.length - 1; i++) {
        if (usedIndices.has(i) || usedIndices.has(i + 1)) continue;

        const fullText = originList[i].text + ' ' + originList[i + 1].text;
        const normFull = normalizeText(fullText);

        const index = normFull.indexOf(input);
        if (index >= 0) {
            // Match found, extract exact text from original (not normalized)
            const rawFull = originList[i].text + ' ' + originList[i + 1].text;
            let matchedRaw = rawFull.substring(index, index + srtText.length);

            // Nếu cắt bị lệch ký tự giữa các đoạn → fallback dùng gốc
            if (normalizeText(matchedRaw) !== input) {
                matchedRaw = srtText; // fallback giữ nguyên
            }

            bestMatch = {
                text: matchedRaw,
                speaker: originList[i].speaker,
                used: [i, i + 1],
            };
            break;
        }
    }

    return bestMatch;
}

// === MAIN
if (!fs.existsSync(srtPath) || !fs.existsSync(originPath)) {
    console.error('❌ File .srt hoặc origin .json không tồn tại!');
    process.exit(1);
}

const srtData = parseSrt(fs.readFileSync(srtPath, 'utf-8'));
const originData = JSON.parse(fs.readFileSync(originPath, 'utf-8'));

const used = new Set();
const result = srtData.map((segment, index) => {
    const match = findBestOriginSegment(segment.text, originData, used);
    let text = segment.text;
    let speaker = null;

    if (match) {
        text = match.text;
        speaker = match.speaker;
        match.used.forEach((i) => used.add(i));
    }

    return {
        order: index,
        start: segment.start,
        end: segment.end,
        text,
        speaker,
    };
});

fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf-8');
console.log(`✅ Done. Normalized saved to: ${outputPath}`);
