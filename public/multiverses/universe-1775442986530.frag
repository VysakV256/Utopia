varying vec2 vUv;
varying vec3 vPosition;
uniform float time;
uniform vec2 resolution;
uniform float uAudio;

// 3D hash function
float hash(vec3 p) {
    p  = fract(p * 0.3183099 + vec3(0.1));
    p *= p.yxz + p.yzx;
    return fract(p.x * p.y * p.z);
}

// 3D Value Noise (similar to Perlin, but simpler interpolation)
float valNoise3D(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    
    // Smoothstep interpolation for cubic smoothness
    f = f * f * (3.0 - 2.0 * f);

    // Get 8 corner hash values
    float n000 = hash(i + vec3(0,0,0));
    float n100 = hash(i + vec3(1,0,0));
    float n010 = hash(i + vec3(0,1,0));
    float n110 = hash(i + vec3(1,1,0));
    float n001 = hash(i + vec3(0,0,1));
    float n101 = hash(i + vec3(1,0,1));
    float n011 = hash(i + vec3(0,1,1));
    float n111 = hash(i + vec3(1,1,1));

    // Interpolate along x-axis
    float ix0 = mix(n000, n100, f.x);
    float ix1 = mix(n010, n110, f.x);
    float ix2 = mix(n001, n101, f.x);
    float ix3 = mix(n011, n111, f.x);

    // Interpolate along y-axis
    float iy0 = mix(ix0, ix1, f.y);
    float iy1 = mix(ix2, ix3, f.y);

    // Interpolate along z-axis
    return mix(iy0, iy1, f.z);
}

// 3D Fractal Brownian Motion (FBM) for complex terrain
float fbm3D(vec3 p) {
    float total = 0.0;
    float amplitude = 0.5; // Initial amplitude
    float frequency = 1.0; // Initial frequency
    float persistence = 0.5; // How much amplitude decreases each octave
    float lacunarity = 2.0; // How much frequency increases each octave

    for (int i = 0; i < 5; ++i) { // 5 octaves for detailed "peaks"
        total += valNoise3D(p * frequency) * amplitude;
        amplitude *= persistence;
        frequency *= lacunarity;
    }
    return total;
}

void main() {
    // Normalize vPosition for noise input and scale it to define feature size.
    // vPosition is on a sphere of radius 500. Dividing by 100.0 scales features to roughly 5 units.
    vec3 p = vPosition / 100.0; 

    // Audio reactivity factor: uAudio (0.0 to 1.0+) makes peaks more dynamic and pronounced.
    float audioInfluence = 1.0 + uAudio * 2.0; // Scales from 1.0 to 3.0+

    // Offset the noise input with time for animated movement and audio for dynamic flow.
    // Different axes move at different speeds for organic motion.
    vec3 noiseInput = p + time * 0.1 * vec3(1.0, 0.7, 0.5) * audioInfluence;
    
    float noiseVal = fbm3D(noiseInput);
    
    // Map noiseVal to a "height" value for the peaks.
    // Audio further amplifies peak height, creating a pulsing "flourishing" effect.
    float height = noiseVal * (1.0 + uAudio * 1.5);
    height = pow(height, 1.5); // Use a power function to sharpen the peaks and exaggerate height differences.

    // Base background color (sky/deep space) - ensures scene isn't pitch black.
    vec3 baseColor = vec3(0.05, 0.05, 0.15); // Dark blue/purple ambient.
    
    // Add a subtle vertical gradient to the background for depth.
    baseColor += vUv.y * 0.08; // Slightly brighter towards the top.

    // Define a vibrant color palette for "flourishing" peaks.
    vec3 color1 = vec3(0.1, 0.3, 0.6);   // Deep ocean/valley blue
    vec3 color2 = vec3(0.2, 0.6, 0.4);   // Lush forest green for mid-slopes
    vec3 color3 = vec3(0.9, 0.8, 0.3);   // Bright golden/yellow for sun-kissed peaks
    vec3 color4 = vec3(0.9, 0.4, 0.7);   // Radiant pink/magenta for highest, most vibrant points

    vec3 finalColor;

    // Interpolate colors based on the calculated 'height'
    if (height < 0.3) {
        finalColor = mix(baseColor, color1, height / 0.3);
    } else if (height < 0.6) {
        finalColor = mix(color1, color2, (height - 0.3) / 0.3);
    } else if (height < 0.8) {
        finalColor = mix(color2, color3, (height - 0.6) / 0.2);
    } else { // For the highest peaks
        finalColor = mix(color3, color4, (height - 0.8) / 0.2);
    }

    // Add a soft atmospheric glow or haze around the peaks for a more ethereal "flourishing" look.
    float hazeEffect = smoothstep(0.4, 1.0, height);
    finalColor += hazeEffect * vec3(0.1, 0.05, 0.0); // Warm, orange glow

    // Boost overall ambient light slightly to ensure general visibility.
    finalColor += baseColor * 0.5;

    // Final audio reactivity: Increase overall brightness and saturation with louder audio.
    float audioBrightnessBoost = uAudio * 0.7; // Max 0.7 additional brightness
    finalColor += audioBrightnessBoost * vec3(1.0); 

    // Clamp the final color to prevent values from going out of range [0, 1].
    finalColor = clamp(finalColor, 0.0, 1.0);

    gl_FragColor = vec4(finalColor, 1.0);
}