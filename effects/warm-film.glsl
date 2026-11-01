// Original YAi Retro Camera effect. Shared by SkSL preview and GLSL export.
// Input/output are linear RGB with SDR BT.709/sRGB primaries.
float filmHash(vec2 p, float tick) {
    float v = mod(p.x * 197.0 + p.y * 233.0 + mod(tick, 1024.0) * 277.0, 4093.0);
    v = mod(v * (v + 131.0), 4093.0);
    return v / 2046.0 - 1.0;
}
vec3 gradeFilm(vec3 rgb, vec2 pixel) {
    rgb += vec3(0.10, 0.02, -0.08) * uWarmth;
    rgb = (rgb - 0.5) * uContrast + 0.5;
    float luma = dot(rgb, vec3(0.2126, 0.7152, 0.0722));
    rgb = mix(vec3(luma), rgb, uSaturation);
    float noise = filmHash(floor(pixel / uGrainScale), floor(uTime * uGrainSpeed));
    float mask = max(1.0 - 2.0 * abs(luma - 0.5), 0.35);
    return clamp(rgb + noise * uGrainIntensity * mask, 0.0, 1.0);
}
