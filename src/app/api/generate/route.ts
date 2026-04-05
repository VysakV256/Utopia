import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs/promises';
import path from 'path';

// Initialize the API with your API key
const apiKey = process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);

export async function POST(req: Request) {
  try {
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured.");
    }

    const body = await req.json();
    const prompt = body.prompt;
    const parentUniverseId = body.parentUniverseId;

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    // You can customize the model based on performance vs quality needs
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const systemInstruction = `
You are an expert Three.js WebGL GLSL shader developer. 
The user will give you a description of an environment, universe, or atmosphere.
Your goal is to generate ONLY a valid GLSL fragment shader that mimics this environment.
The shader will be mapped onto a large sphere or backdrop surrounding the camera.

VARYINGS & UNIFORMS AVAILABLE:
- varying vec2 vUv;
- varying vec3 vPosition;
- uniform float time; // Timestamp in seconds
- uniform vec2 resolution; // Screen resolution
- uniform float uAudio; // User microphone amplitude (0.0 to 1.0+)

CRITICAL INSTRUCTIONS:
1. ONLY return the raw GLSL fragment shader code. Do not wrap it in markdown block quotes (e.g. \`\`\`glsl).
2. DO NOT include any HTML, JS, or explanations. 
3. ENSURE it compiles correctly. The main function must be 'void main() { ... }'.
4. Set the output color to 'gl_FragColor'.
5. Remember 'vUv' is a vec2(0.0-1.0), 'vPosition' is the 3D coordinate on the huge sphere (radius 500).
6. SCALING: Make sure any stars, planets, or shapes you generate are LARGE enough to be seen! 
   Do NOT use microscopic scales (e.g., starRadius = 0.005 on a 500-unit sphere will span 0.3 pixels and visibly disappear into a black screen). Use sizes like 0.05 or larger.
7. BRIGHTNESS: Make sure your ambient background colors are at least vec3(0.1, 0.1, 0.15) so the scene isn't pitch black.
8. AUDIO REACTIVITY: You MUST incorporate the 'uAudio' uniform to modulate colors, wave sizes, pulsing, or brightness so the universe reacts dynamically to the user's voice intensity.

Example minimal output:
varying vec2 vUv;
uniform float time;
uniform float uAudio;
void main() {
    gl_FragColor = vec4(vUv, 0.5 + 0.5 * sin(time) + uAudio, 1.0);
}
`;

    const fullPrompt = `System: ${systemInstruction}\n\nUser Request: Create a 3D shader environment for the following prompt: "${prompt}"\n`;

    const result = await model.generateContent(fullPrompt);
    const textOut = result.response.text();

    // Minor cleanup in case the LLM ignored instruction #1 and wrapped in backticks
    const cleanShader = textOut.replace(/^```(glsl)?\s*/i, '').replace(/\s*```$/i, '').trim();

    // Persistent Saving Logic
    const timestamp = Date.now();
    const id = `universe-${timestamp}`;
    const targetDir = path.join(process.cwd(), 'public', 'multiverses');
    
    // Ensure directory exists
    await fs.mkdir(targetDir, { recursive: true });

    // Save the raw shader
    await fs.writeFile(path.join(targetDir, `${id}.frag`), cleanShader, 'utf-8');

    // Read existing universes to find neighbors
    let neighborUniverseIds: string[] = [];
    try {
      const files = await fs.readdir(targetDir);
      const jsonFiles = files.filter(f => f.endsWith('.json'));
      if (jsonFiles.length > 0) {
        // Pick 1 or 2 random neighbors
        const numNeighbors = Math.min(jsonFiles.length, Math.floor(Math.random() * 2) + 1);
        const shuffled = jsonFiles.sort(() => 0.5 - Math.random());
        // Avoid adding itself or parent as neighbor
        const availableNeighbors = shuffled
            .map(f => f.replace('.json', ''))
            .filter(nId => nId !== id && nId !== parentUniverseId);
        neighborUniverseIds = availableNeighbors.slice(0, numNeighbors);
      }
    } catch(e) {
      // Ignore if directory doesn't exist or other read errors
    }

    // Save the metadata
    const metadata: any = {
      id,
      name: prompt.substring(0, 30) + (prompt.length > 30 ? '...' : ''),
      prompt,
      timestamp,
      // Rather than duplicating shader data in the json, we just point to the frag file
      shaderUrl: `/multiverses/${id}.frag`
    };
    
    if (parentUniverseId) metadata.parentUniverseId = parentUniverseId;
    if (neighborUniverseIds.length > 0) metadata.neighborUniverseIds = neighborUniverseIds;

    await fs.writeFile(path.join(targetDir, `${id}.json`), JSON.stringify(metadata, null, 2), 'utf-8');

    return NextResponse.json({ 
      id: metadata.id,
      name: metadata.name,
      prompt: metadata.prompt,
      timestamp: metadata.timestamp,
      shader: cleanShader,
      parentUniverseId: metadata.parentUniverseId,
      neighborUniverseIds: metadata.neighborUniverseIds
    });
  } catch (error: any) {
    console.error('Error generating shader:', error);
    return NextResponse.json({ error: error.message || 'Failed to generate shader' }, { status: 500 });
  }
}
