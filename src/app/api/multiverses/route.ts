import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function GET() {
  try {
    const targetDir = path.join(process.cwd(), 'public', 'multiverses');
    
    // Ensure dir exists to avoid errors on fresh start
    try {
      await fs.access(targetDir);
    } catch {
      await fs.mkdir(targetDir, { recursive: true });
      return NextResponse.json({ multiverses: [] });
    }

    const files = await fs.readdir(targetDir);
    const jsonFiles = files.filter(f => f.endsWith('.json'));

    const multiverses = [];

    for (const jsonFile of jsonFiles) {
      try {
        const metadataRaw = await fs.readFile(path.join(targetDir, jsonFile), 'utf-8');
        const metadata = JSON.parse(metadataRaw);

        // Also fetch the corresponding frag file so it can be loaded directly into memory
        const fragFile = metadata.id + '.frag';
        const shaderCode = await fs.readFile(path.join(targetDir, fragFile), 'utf-8');

        multiverses.push({
          ...metadata,
          shader: shaderCode
        });
      } catch (err) {
        console.error(`Error reading multiverse ${jsonFile}:`, err);
      }
    }

    // Sort by timestamp descending (newest first)
    multiverses.sort((a, b) => b.timestamp - a.timestamp);

    return NextResponse.json({ multiverses });
  } catch (error: any) {
    console.error('Error fetching multiverses:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
