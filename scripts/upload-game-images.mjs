/**
 * 보드라이프 게임 이미지를 Supabase Storage에 업로드하는 스크립트
 *
 * 실행 방법: node scripts/upload-game-images.mjs
 *
 * 동작:
 * 1. .playwright-mcp/bl_images/*.json 에 저장된 base64 이미지 데이터를 읽음
 * 2. Supabase Storage game-images 버킷에 업로드
 * 3. player_games 테이블의 thumbnail_url 업데이트
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

// Load env
const envPath = path.join(ROOT, '.env.local');
const envContent = readFileSync(envPath, 'utf8');
const env = Object.fromEntries(
  envContent.split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const [k, ...v] = l.split('='); return [k.trim(), v.join('=').trim()]; })
);

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = 'game-images';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const DATA_DIR = path.join(ROOT, '.playwright-mcp');

async function uploadImage(boardlife_id, b64, ext) {
  const mimeMap = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp', avif: 'image/avif' };
  const mime = mimeMap[ext] ?? 'image/jpeg';
  const filePath = `boardlife/${boardlife_id}.${ext}`;

  // Decode base64 to Buffer
  const buffer = Buffer.from(b64, 'base64');

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, buffer, {
      contentType: mime,
      upsert: true,
    });

  if (error) throw new Error(`Storage upload failed: ${error.message}`);

  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(filePath);
  return publicUrl;
}

async function updateDB(boardlife_id, publicUrl) {
  const { error } = await supabase
    .from('player_games')
    .update({ thumbnail_url: publicUrl })
    .eq('boardlife_id', boardlife_id);
  if (error) throw new Error(`DB update failed: ${error.message}`);
}

async function main() {
  // Collect all batch result files
  const files = readdirSync(DATA_DIR).filter(f => f.startsWith('bl_batch') && f.endsWith('.json'));
  console.log(`Found ${files.length} batch files: ${files.join(', ')}`);

  let totalOk = 0, totalErr = 0, totalSkip = 0;

  for (const file of files) {
    const data = JSON.parse(readFileSync(path.join(DATA_DIR, file), 'utf8'));
    console.log(`\nProcessing ${file} (${data.length} items)...`);

    for (const item of data) {
      if (item.error) {
        console.log(`  SKIP ${item.id} — download error: ${item.error}`);
        totalSkip++;
        continue;
      }

      try {
        const url = await uploadImage(item.id, item.b64, item.ext);
        await updateDB(item.id, url);
        console.log(`  OK   ${item.id} → ${url.slice(0, 80)}`);
        totalOk++;
      } catch (e) {
        console.error(`  ERR  ${item.id}: ${e.message}`);
        totalErr++;
      }
    }
  }

  console.log(`\n=== Done: ${totalOk} uploaded, ${totalErr} errors, ${totalSkip} skipped ===`);
}

main().catch(console.error);
