varying vec2 vUv;
varying vec3 vPosition;
uniform float time;
uniform vec2 resolution;

// --- Simplex Noise function by Inigo Quilez ---
// Source: https://thebookofshaders.com/edit.php#example_noise_simplex3d
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
    const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

    // First corner
    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);

    // Other corners
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);

    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;

    // Permutations
    i = mod289(i);
    vec4 p = permute(permute(permute(
              i.z + vec4(0.0, i1.z, i2.z, 1.0))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0));

    // Gradients: 7x7 points over a cube, mapped to 44 values
    float n_ = 1.0 / 7.0;
    vec3 ns = n_ * D.wyz - D.xyz;

    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);

    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);

    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));

    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);

    // Normalize gradients
    vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;

    // Mix final noise value
    vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1),
                                  dot(p2, x2), dot(p3, x3)));
}

// Fractal Brownian Motion (FBM) with time-based evolution
float fbm(vec3 p, float t_offset) {
    float total = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;
    
    // Add time offset to one dimension to make the noise evolve,
    // simulating "wandering" or growth through a 4D noise space.
    p += vec3(t_offset * 0.5, t_offset * 0.3, t_offset * 0.7); 
    
    for (int i = 0; i < 4; ++i) { // 4 octaves for rich detail
        total += snoise(p * frequency) * amplitude;
        frequency *= 2.0; // Increase frequency for finer details
        amplitude *= 0.5; // Decrease amplitude for less impact of finer details
    }
    return total * 0.5 + 0.5; // Remap to [0, 1]
}

void main() {
    // Normalize vPosition to get a direction vector on the unit sphere surface.
    // This allows noise patterns to wrap seamlessly around the large sphere backdrop.
    vec3 worldDir = normalize(vPosition);

    // Define scales for different layers of "fields" and "crests"
    float baseScale = 5.0;   // Broad, flowing patterns for the main fields
    float detailScale = 12.0; // Finer patterns layered on top
    float crestScale = 20.0; // Very fine, active patterns for the "wandering crests"

    // Calculate base field noise: creates the foundational green/lush areas
    float fieldNoise = fbm(worldDir * baseScale, time * 0.02); // Slow, continuous evolution
    fieldNoise = (fieldNoise * 0.6 + fbm(worldDir * detailScale, time * 0.03) * 0.4); // Blend with finer details

    // Calculate "wandering crest" noise: emphasizes peaks and movement
    float crestNoise = fbm(worldDir * crestScale, time * 0.05); // Faster, more dynamic evolution
    crestNoise = pow(crestNoise, 3.0); // Sharpen peaks to create distinct crests

    // Define flourishing color palette
    vec3 colorDeepAmbient = vec3(0.08, 0.12, 0.15); // Deep blue-green for base ambient
    vec3 colorFieldGreen = vec3(0.1, 0.3, 0.2);     // Mid-tone green for the fields
    vec3 colorFieldLush = vec3(0.2, 0.5, 0.35);     // Lush, vibrant green for flourishing areas
    vec3 colorCrestHighlight = vec3(0.9, 0.8, 0.4); // Golden yellow for the active crests
    vec3 colorCrestGlow = vec3(1.0, 0.6, 0.2);      // Intense orange glow for the brightest core of crests

    // Start with the deep ambient color
    vec3 finalColor = colorDeepAmbient;

    // Blend base field colors based on `fieldNoise`
    finalColor = mix(finalColor, colorFieldGreen, smoothstep(0.1, 0.5, fieldNoise));
    finalColor = mix(finalColor, colorFieldLush, smoothstep(0.4, 0.8, fieldNoise));

    // Overlay and enhance the "wandering crests"
    finalColor = mix(finalColor, colorCrestHighlight, crestNoise); // Blend in golden highlights
    // Add an extra, intense glow for the sharpest parts of the crests
    finalColor += colorCrestGlow * pow(crestNoise, 5.0) * 0.5; 

    // Add some subtle, gentle overall color breathing/pulsing based on time
    // to give a sense of continuous "flourishing"
    finalColor *= (0.9 + 0.1 * sin(time * 0.5 + dot(worldDir, vec3(1.0, 2.0, 3.0))));
    
    // Ensure the overall scene isn't too dark, as per instructions
    finalColor = max(finalColor, vec3(0.1, 0.1, 0.15));

    gl_FragColor = vec4(finalColor, 1.0);
}