varying vec2 vUv;
varying vec3 vPosition;
uniform float time;
uniform vec2 resolution;
uniform float uAudio;

// 3D hash function from https://www.shadertoy.com/view/MdKGzW
vec3 hash33(vec3 p) {
    p = fract(p * vec3(443.897, 441.423, 437.195));
    p += dot(p, p.yxz + 19.19);
    return fract(vec3(p.x * p.y, p.z * p.x, p.y * p.z));
}

// Value noise for 3D
float noise3D(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);

    vec3 u = f * f * (3.0 - 2.0 * f); // Smoothstep interpolation

    float a = hash33(i + vec3(0.0,0.0,0.0)).x;
    float b = hash33(i + vec3(1.0,0.0,0.0)).x;
    float c = hash33(i + vec3(0.0,1.0,0.0)).x;
    float d = hash33(i + vec3(1.0,1.0,0.0)).x;
    float e = hash33(i + vec3(0.0,0.0,1.0)).x;
    float g = hash33(i + vec3(1.0,0.0,1.0)).x;
    float h = hash33(i + vec3(0.0,1.0,1.0)).x;
    float j = hash33(i + vec3(1.0,1.0,1.0)).x;

    return mix(mix(mix(a, b, u.x),
                   mix(c, d, u.x), u.y),
               mix(mix(e, g, u.x),
                   mix(h, j, u.x), u.y), u.z);
}

// Fractal Brownian Motion (FBM) for complex terrain
float fbm(vec3 p) {
    float total = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;
    for (int i = 0; i < 4; ++i) { // 4 octaves for detail
        total += noise3D(p * frequency) * amplitude;
        frequency *= 2.0;
        amplitude *= 0.5;
    }
    return total;
}

// Generates the dawn sky color based on direction, time, audio intensity, and sun direction.
vec3 getSkyColor(vec3 dir, float t, float audioIntensity, vec3 sunDir) {
    vec3 skyColor;

    // Base colors for a dawn gradient
    vec3 darkPurple = vec3(0.03, 0.0, 0.08); // Deep pre-dawn
    vec3 deepBlue = vec3(0.05, 0.05, 0.15); // Base ambient for atmosphere, as per instructions.
    vec3 orangeRed = vec3(0.8, 0.35, 0.15); // Fiery sunrise
    vec3 brightYellow = vec3(1.0, 0.85, 0.5); // Brightest part of the sun glow
    vec3 paleBlue = vec3(0.4, 0.6, 0.9); // Higher sky, post-dawn

    // Vertical gradient based on `dir.y` (Y-axis pointing up)
    float y = dir.y;

    // Horizon blend factor, shifted slightly down
    float horizonBlend = smoothstep(-0.2, 0.2, y + 0.1);

    // Lower part of sky (darker, pre-dawn to sunrise)
    vec3 lowerSky = mix(darkPurple, deepBlue, smoothstep(-1.0, -0.4, y));
    lowerSky = mix(lowerSky, orangeRed, smoothstep(-0.4, 0.0, y));

    // Upper part of sky (brighter, sunrise to pale day)
    vec3 upperSky = mix(orangeRed, brightYellow, smoothstep(-0.1, 0.3, y));
    upperSky = mix(upperSky, paleBlue, smoothstep(0.3, 0.8, y));

    skyColor = mix(lowerSky, upperSky, horizonBlend);

    // Add a strong sun glow at the horizon
    float sunDot = max(0.0, dot(dir, sunDir));
    // Audio makes the sun glow more intense and spread.
    vec3 sunGlow = pow(sunDot, 10.0 + audioIntensity * 20.0) * brightYellow * (1.0 + audioIntensity * 2.0);
    sunGlow += pow(sunDot, 2.0 + audioIntensity * 5.0) * orangeRed * 0.5;

    skyColor += sunGlow;

    // Ensure minimum ambient brightness as per instructions
    skyColor = max(skyColor, vec3(0.1, 0.1, 0.15));

    // Audio reactivity: overall intensification of sky colors
    skyColor *= (1.0 + audioIntensity * 0.6);

    return skyColor;
}

void main() {
    vec3 viewDir = normalize(vPosition); // Direction from camera to fragment, acts as the base normal for the sphere.

    // --- Dawn Sun Setup ---
    // Sun direction, positioned low at the horizon, slowly shifts/bobs for a dynamic dawn.
    // X-component for horizontal position, Y for vertical, Z for depth.
    vec3 sunDir = normalize(vec3(0.5, 0.1 + sin(time * 0.02) * 0.05, -1.0));

    // --- Sky Color (Background) ---
    vec3 finalColor = getSkyColor(viewDir, time, uAudio, sunDir);

    // --- Mountains (Procedural with FBM) ---
    float mountainDensity = 2.5; // Controls the "scale" of the peaks (how many repeat)
    float mountainAmplitude = 0.8; // Visual height of mountains (influences shading)
    float audioPeakFactor = 1.0 + uAudio * 1.5; // Audio makes peaks taller/sharper
    float audioScrollSpeed = uAudio * 0.05; // Audio adds subtle motion to the noise field

    vec3 noiseCoord = viewDir * mountainDensity;
    noiseCoord.y += time * 0.02 + audioScrollSpeed; // Slow vertical drift over time
    noiseCoord.x += time * 0.01;                     // Slow horizontal drift

    float height = fbm(noiseCoord);
    height = pow(height, 2.0 * audioPeakFactor) * mountainAmplitude; // Sharpen and amplify peaks, audio makes them spikier

    // Fade out mountains above the "horizon" and emphasize lower parts
    // smoothstep(edge0, edge1, x) returns 0.0 if x <= edge0 and 1.0 if x >= edge1.
    // So, `mountainFade` is 0.0 below y=-0.9 and 1.0 above y=0.2.
    float mountainFade = smoothstep(-0.9, 0.2, viewDir.y);
    height = max(0.0, height - (1.0 - mountainFade) * 0.5); // Subtract more height as `viewDir.y` increases, making them fade.

    // Calculate a perturbed normal for lighting the mountains.
    // This uses finite differencing (sampling height at slightly offset positions) to estimate the gradient.
    float d = 0.005; // Small step size for derivatives
    vec3 d_vec_x = vec3(d, 0, 0);
    vec3 d_vec_y = vec3(0, d, 0);
    vec3 d_vec_z = vec3(0, 0, d);

    // Recalculate height for perturbed positions to estimate local slope
    float h_dx = fbm((viewDir + d_vec_x) * mountainDensity + time * vec3(0.02, 0.01, 0.0) + audioScrollSpeed);
    h_dx = pow(h_dx, 2.0 * audioPeakFactor) * mountainAmplitude;
    h_dx = max(0.0, h_dx - (1.0 - smoothstep(-0.9, 0.2, (viewDir + d_vec_x).y)) * 0.5);

    float h_dy = fbm((viewDir + d_vec_y) * mountainDensity + time * vec3(0.02, 0.01, 0.0) + audioScrollSpeed);
    h_dy = pow(h_dy, 2.0 * audioPeakFactor) * mountainAmplitude;
    h_dy = max(0.0, h_dy - (1.0 - smoothstep(-0.9, 0.2, (viewDir + d_vec_y).y)) * 0.5);

    float h_dz = fbm((viewDir + d_vec_z) * mountainDensity + time * vec3(0.02, 0.01, 0.0) + audioScrollSpeed);
    h_dz = pow(h_dz, 2.0 * audioPeakFactor) * mountainAmplitude;
    h_dz = max(0.0, h_dz - (1.0 - smoothstep(-0.9, 0.2, (viewDir + d_vec_z).y)) * 0.5);

    // The normal gradient points in the direction of steepest ascent of the height field.
    // Subtracting it from the base normal perturbs the normal effectively.
    vec3 normalGradient = vec3(h_dx - height, h_dy - height, h_dz - height) / d;
    vec3 perturbedNormal = normalize(viewDir - normalGradient * 0.2); // 0.2 is bump strength

    // Lighting calculation for mountains
    float diffuse = max(0.0, dot(perturbedNormal, sunDir));
    // Audio makes the sun's diffuse light more intense on the peaks
    diffuse = pow(diffuse, 1.0 + uAudio * 1.0) * (1.0 + uAudio * 0.5);

    vec3 mountainColorBase = vec3(0.05, 0.05, 0.1);    // Dark, rocky base color
    vec3 mountainColorPeak = vec3(0.2, 0.15, 0.25);    // Lighter, slightly purple/gray peaks
    vec3 mountainAmbient = vec3(0.1, 0.1, 0.15);       // Minimum ambient light for mountains

    vec3 mountainSurfaceColor = mix(mountainColorBase, mountainColorPeak, height * 0.8);
    mountainSurfaceColor = mountainSurfaceColor * (mountainAmbient + diffuse * 1.5); // Combine ambient and diffuse lighting
    mountainSurfaceColor *= (1.0 + uAudio * 0.3); // Audio intensifies mountain color

    // Blend mountains with the sky. Mountains appear from below `y=0.0` and fully transition to sky by `y=0.2`.
    float blendFactor = smoothstep(0.0, 0.2, viewDir.y);
    finalColor = mix(mountainSurfaceColor, finalColor, blendFactor);

    gl_FragColor = vec4(finalColor, 1.0);
}