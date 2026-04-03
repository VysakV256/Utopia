varying vec2 vUv;
varying vec3 vPosition;
uniform float time;
uniform vec2 resolution;

// A 1D hash function from a float input, returns a float in [0,1]
float hash11(float p) {
    p = fract(p * 0.1031);
    p *= p + 33.33;
    p *= p + p;
    return fract(p);
}

// A 3D hash function from a vec3 input, returns a vec3 with components in [0,1]
vec3 hash33(vec3 p) {
    p = fract(p * vec3(0.1031, 0.11369, 0.13787));
    p += dot(p, p.yxz + 19.19);
    return fract((p.xxy + p.yzz) * p.zyx);
}

void main() {
    // vPosition is a 3D coordinate on the sphere, normalize it to get a direction vector from the origin.
    vec3 rayDir = normalize(vPosition);

    vec3 finalColor = vec3(0.0); // Start with a black background

    // --- Deep Space Haze/Nebulosity ---
    // Use different scales of noise for varied background texture
    float backgroundNoise1 = hash11(dot(rayDir * 5.0, vec3(1.23, 4.56, 7.89)) + time * 0.01);
    float backgroundNoise2 = hash11(dot(rayDir * 10.0, vec3(9.87, 6.54, 3.21)) + time * 0.02);
    
    // Combine noises, power it to make it wispy and sparse
    float totalBackgroundNoise = pow(backgroundNoise1 + backgroundNoise2 * 0.5, 3.0) * 0.6; 
    
    // Base deep space color, boosted to be visible
    vec3 nebulaColor = vec3(0.05, 0.05, 0.1) + vec3(0.1, 0.2, 0.4) * totalBackgroundNoise;
    finalColor += nebulaColor;

    // --- Star Generation ---
    float starDensity = 40.0; // Greatly increased cell size so stars are bigger
    vec3 p = rayDir * starDensity;

    vec3 ip = floor(p); // Integer part of the scaled position (cell ID)
    vec3 fp = fract(p); // Fractional part (position within the current cell [0,1))

    // Generate a pseudo-random offset for a potential star within this cell
    // Each cell will have a unique, consistent star position
    vec3 starRandOffset = hash33(ip);

    // Add a time-based flicker/twinkle to the stars
    vec3 flickerSeed = ip + floor(time * 0.15); // Changes flicker pattern every 0.15 seconds
    float flicker = hash11(dot(flickerSeed, vec3(1.0, 2.0, 3.0))); // Random flicker value for this specific star
    
    // Calculate the distance from the current fragment's position within the cell
    // to the potential star's center (defined by starRandOffset)
    float distToStar = length(fp - starRandOffset);

    // Star appearance parameters (boosted massively from 0.005 so they don't fall sub-pixel)
    float starRadius = 0.05;      // Controls the core size of the star's glow
    float starSharpness = 0.1;   // Controls how sharp the falloff is

    // Use smoothstep for a soft, anti-aliased star glow
    float starBrightness = smoothstep(starRadius + starSharpness, starRadius, distToStar);

    // Add some variation to star brightness based on its unique hash
    float starTypeHash = hash11(dot(ip, vec3(4.0, 5.0, 6.0)));
    starBrightness *= (0.5 + 0.5 * starTypeHash); // Brighter or dimmer stars

    // Apply the twinkle effect
    starBrightness *= (0.7 + 0.3 * flicker); // Stars twinkle slightly

    // Define star color (mostly white, with subtle variations)
    vec3 starColor = vec3(1.0); // Default to white
    
    // Introduce subtle color variation: some bluer, some redder
    if (starTypeHash > 0.7) { // Bluer stars
        starColor = mix(starColor, vec3(0.8, 0.9, 1.0), (starTypeHash - 0.7) * 3.0);
    } else if (starTypeHash < 0.3) { // Redder/warmer stars
        starColor = mix(starColor, vec3(1.0, 0.9, 0.8), (0.3 - starTypeHash) * 3.0);
    }
    
    // Add the stars to the final color, making them quite bright
    finalColor += starColor * starBrightness * 12.0;

    // Add a very faint "bloom" effect for brighter stars to enhance their presence
    // This is achieved by adding a high-power version of the brightness
    finalColor += starColor * pow(starBrightness, 5.0) * 15.0; 

    gl_FragColor = vec4(finalColor, 1.0);
}