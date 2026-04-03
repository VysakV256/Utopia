varying vec2 vUv;
varying vec3 vPosition;
uniform float time;
uniform vec2 resolution;

// 1D Hash function (used for noise generation)
float hash(float n) {
    return fract(sin(n) * 43758.5453123);
}

// 3D Value Noise function
// Based on integer coordinates for hashing and fractional for interpolation.
float noise_func(vec3 x) {
    vec3 p = floor(x);
    vec3 f = fract(x);

    // Smooth interpolation function
    f = f * f * (3.0 - 2.0 * f);

    // Get the 8 corners of the cube and hash their integer coordinates
    // Using a simple 1D hash of combined integer coordinates
    float n000 = hash(p.x + p.y * 157.0 + p.z * 113.0);
    float n100 = hash(p.x + 1.0 + p.y * 157.0 + p.z * 113.0);
    float n010 = hash(p.x + (p.y + 1.0) * 157.0 + p.z * 113.0);
    float n110 = hash(p.x + 1.0 + (p.y + 1.0) * 157.0 + p.z * 113.0);
    float n001 = hash(p.x + p.y * 157.0 + (p.z + 1.0) * 113.0);
    float n101 = hash(p.x + 1.0 + p.y * 157.0 + (p.z + 1.0) * 113.0);
    float n011 = hash(p.x + (p.y + 1.0) * 157.0 + (p.z + 1.0) * 113.0);
    float n111 = hash(p.x + 1.0 + (p.y + 1.0) * 157.0 + (p.z + 1.0) * 113.0);

    // Interpolate along X
    float ix0 = mix(n000, n100, f.x);
    float ix1 = mix(n010, n110, f.x);
    float ix2 = mix(n001, n101, f.x);
    float ix3 = mix(n011, n111, f.x);

    // Interpolate along Y
    float iy0 = mix(ix0, ix1, f.y);
    float iy1 = mix(ix2, ix3, f.y);

    // Interpolate along Z
    return mix(iy0, iy1, f.z); // Range [0, 1]
}

// Fractal Brownian Motion (FBM) - combines multiple octaves of noise
float fbm_func(vec3 p) {
    float value = 0.0;
    float amplitude = 1.0;
    float frequency = 1.0;
    float sum_amplitude = 0.0;

    for (int i = 0; i < 5; i++) { // 5 octaves for detail
        value += amplitude * noise_func(p * frequency);
        sum_amplitude += amplitude;
        frequency *= 2.0;
        amplitude *= 0.5;
    }
    return value / sum_amplitude; // Normalize to [0, 1]
}

void main() {
    // Scale vPosition to a suitable range for noise
    // Radius of sphere is 500, so vPosition components are roughly -500 to 500.
    // Scaling by 0.01 makes noise coordinates range from -5 to 5, providing large, visible patterns.
    vec3 p = vPosition * 0.01;
    
    // Animate the noise coordinates for a sense of 'flourishing' and 'freedom'
    // This creates swirling, flowing motion across the fields.
    p.xy += vec2(sin(time * 0.1), cos(time * 0.15)) * 10.0;
    p.z += time * 0.05; // Gentle scrolling animation through the scene

    // Generate base noise for the overall field structure
    float baseNoise = fbm_func(p * 2.0); // Larger scale features

    // Add higher frequency noise for fine details, texture, and 'ruggedness'
    // Animated differently to enhance the 'flourishing' and dynamic feel.
    float detailNoise = fbm_func(p * 5.0 + vec3(time * 0.2)) * 0.5; // Reduced amplitude for detail

    // Add a fast-moving, high-frequency shimmer for "freedom" or "energy" sparkle
    float shimmer = noise_func(vPosition * 0.05 + time * 0.5) * 0.2;

    // Combine noise layers
    // Using pow() on baseNoise emphasizes "mountain heart" peaks and gives a more defined structure.
    float combinedNoise = pow(baseNoise, 1.5) + detailNoise + shimmer;
    
    // Normalize combined noise to [0, 1] range.
    // Max value is roughly 1.0 (base) + 0.5 (detail) + 0.2 (shimmer) = 1.7
    combinedNoise = clamp(combinedNoise / 1.7, 0.0, 1.0);

    // Define color palette representing "mountain heart" and "flourishing"
    vec3 mountainBase = vec3(0.05, 0.08, 0.1);    // Deep blue-gray, for depth/shadows
    vec3 mountainMid = vec3(0.15, 0.2, 0.25);     // Slightly lighter, rocky tones
    vec3 flourishingGreen = vec3(0.2, 0.5, 0.25); // Vibrant green for fields
    vec3 flourishingYellow = vec3(0.8, 0.9, 0.3); // Bright yellow-green, indicating peak flourish
    vec3 heartGlow = vec3(1.0, 0.5, 0.1);         // Warm orange/gold, representing the "heart"
    vec3 freedomSparkle = vec3(0.7, 0.3, 1.0);    // Magical purple/magenta for intense "freedom"

    // Blend colors based on the combined noise value
    vec3 finalColor;
    if (combinedNoise < 0.2) {
        finalColor = mix(mountainBase, mountainMid, combinedNoise / 0.2);
    } else if (combinedNoise < 0.45) {
        finalColor = mix(mountainMid, flourishingGreen, (combinedNoise - 0.2) / 0.25);
    } else if (combinedNoise < 0.7) {
        finalColor = mix(flourishingGreen, flourishingYellow, (combinedNoise - 0.45) / 0.25);
    } else if (combinedNoise < 0.9) {
        finalColor = mix(flourishingYellow, heartGlow, (combinedNoise - 0.7) / 0.2);
    } else {
        finalColor = mix(heartGlow, freedomSparkle, (combinedNoise - 0.9) / 0.1);
    }

    // Add a strong glow effect to the brightest areas (peaks of flourishing/heart)
    finalColor = mix(finalColor, vec3(1.0), pow(combinedNoise, 5.0) * 0.3);
    
    // Overall brightness adjustment
    finalColor *= 1.2;

    // Ensure minimum ambient brightness as per instructions
    finalColor = max(finalColor, vec3(0.1, 0.1, 0.15));

    gl_FragColor = vec4(finalColor, 1.0);
}