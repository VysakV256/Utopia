// Simplex noise (from https://github.com/ashima/webgl-noise/blob/master/src/classic/snoise3D.glsl)
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

    // First corner
    vec3 i  = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);

    // Other corners
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min( g.xyz, l.zxy );
    vec3 i2 = max( g.xyz, l.zxy );

    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy; 
    vec3 x3 = x0 - D.yyy;      

    // Permutations
    i = mod289(i);
    vec4 p = permute( permute( permute(
               i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
             + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
             + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

    // Gradients: 7x7 points over a cube, mapped onto an octahedron.
    vec4 j4 = 17.0 * p - D.yyyy;
    vec4 jx = mod(floor(j4 / 7.0), 3.0);
    vec4 jy = mod(floor(j4 / 3.0), 3.0);
    vec4 jz = mod(j4, 3.0);
    vec4 jx_ = abs(jx - 1.0);
    vec4 jy_ = abs(jy - 1.0);
    vec4 jz_ = abs(jz - 1.0);
    vec4 p_ = mod(p / 7.0, 2.0);
    vec4 q_ = mod(floor(p / 49.0), 2.0);
    vec4 A = mod(p_ + q_, 2.0);
    vec4 B = mod(jx_ + jy_ + jz_, 2.0);
    vec4 g0 = vec4(jx - 1.0, jy - 1.0, jz - 1.0, 0.0);
    vec4 g1 = vec4(jx + A - 1.0, jy + B - 1.0, jz - 1.0, 0.0);
    vec4 g2 = vec4(jx + A - 1.0, jy + B - 1.0, jz + D.y - 1.0, 0.0);
    vec4 g3 = vec4(jx + A - 1.0, jy + B - 1.0, jz + D.z - 1.0, 0.0);
    
    vec4 N = taylorInvSqrt(g0.x*g0.x + g0.y*g0.y + g0.z*g0.z + g1.x*g1.x + g1.y*g1.y + g1.z*g1.z + g2.x*g2.x + g2.y*g2.y + g2.z*g2.z + g3.x*g3.x + g3.y*g3.y + g3.z*g3.z);
    g0.xyz *= N.x;
    g1.xyz *= N.y;
    g2.xyz *= N.z;
    g3.xyz *= N.w;

    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot( m*m, vec4( dot(x0, g0.xyz), dot(x1, g1.xyz),
                                 dot(x2, g2.xyz), dot(x3, g3.xyz) ) );
}

// Fractal Brownian Motion (fBm) function for layered noise
float fbm(vec3 p) {
    float G = 2.0;       // Lacunarity: how quickly the frequency increases
    float H = 0.5;       // Persistence: how quickly the amplitude decreases
    float total = 0.0;
    float frequency = 1.0;
    float amplitude = 0.5; // Base amplitude for noise output
    for (int i = 0; i < 5; i++) {
        total += snoise(p * frequency) * amplitude;
        frequency *= G;
        amplitude *= H;
    }
    return total;
}

varying vec2 vUv;
varying vec3 vPosition;
uniform float time;
uniform vec2 resolution;

void main() {
    // Scale vPosition for noise sampling. vPosition is on a sphere of radius 500.
    // A scale of 0.007 means features will be roughly 1 / 0.007 = 142 units in size,
    // which is visible and appropriate for "infinite peaks" on a large sphere.
    vec3 p = vPosition * 0.007;

    // Generate noise for the 'height' of the peaks, with subtle time animation
    float noiseVal = fbm(p + time * 0.05);

    // Map noise from [-1, 1] range to [0, 1]
    noiseVal = (noiseVal + 1.0) * 0.5;

    // Emphasize peaks and valleys for more distinct features
    noiseVal = pow(noiseVal, 1.5);

    // Define color palette for "flourishing fields" and "infinite peaks"
    vec3 colorLow = vec3(0.08, 0.25, 0.08); // Dark, rich green for deep valleys
    vec3 colorMid = vec3(0.2, 0.5, 0.2);    // Medium flourishing green for fields
    vec3 colorHigh = vec3(0.4, 0.7, 0.3);   // Bright sunlit green for higher slopes
    vec3 colorPeak = vec3(0.6, 0.65, 0.4);  // Light yellow-green, hints of rock/dryness for very highest points

    vec3 finalColor;

    // Blend colors based on noise value
    if (noiseVal < 0.3) {
        finalColor = mix(colorLow, colorMid, noiseVal / 0.3);
    } else if (noiseVal < 0.6) {
        finalColor = mix(colorMid, colorHigh, (noiseVal - 0.3) / 0.3);
    } else { // noiseVal >= 0.6
        finalColor = mix(colorHigh, colorPeak, (noiseVal - 0.6) / 0.4);
    }

    // Add a slight vertical gradient to simulate general lighting or atmospheric perspective.
    // Normalize vPosition.y from -500 to 500 to a 0-1 range.
    float y_norm = (vPosition.y + 500.0) / 1000.0;
    y_norm = smoothstep(0.0, 1.0, y_norm); // Smooth the gradient

    // Make the upper parts of the sphere slightly brighter or more 'sky-like' in tint
    vec3 y_light_tint = vec3(0.1, 0.1, 0.05); // A subtle yellowish/white tint
    finalColor += y_norm * 0.2 * y_light_tint;
    
    // Ensure minimum brightness to avoid pitch black areas, as per instructions.
    finalColor = max(finalColor, vec3(0.1, 0.1, 0.15));

    gl_FragColor = vec4(finalColor, 1.0);
}