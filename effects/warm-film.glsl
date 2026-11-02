// Original procedural layers and five-point tone LUT. Linear SDR RGB in/out.
float filmHash(vec2 p, float tick) {
    float v = mod(p.x * 197.0 + p.y * 233.0 + mod(tick, 1024.0) * 277.0, 4093.0);
    v = mod(v * (v + 131.0), 4093.0);
    return v / 2046.0 - 1.0;
}
float filmLut(float x) {
    x=clamp(x,0.0,1.0)*4.0;
    if(x<1.0)return mix(uLut0,uLut1,x);
    if(x<2.0)return mix(uLut1,uLut2,x-1.0);
    if(x<3.0)return mix(uLut2,uLut3,x-2.0);
    return mix(uLut3,uLut4,x-3.0);
}
vec2 warpFilm(vec2 uv) {
    uv.x+=uJitter*0.0018*sin(uv.y*75.0+uTime*4.0);
    return clamp(uv,0.0,1.0);
}
vec3 gradeFilm(vec3 rgb, vec2 pixel) {
    vec2 uv=pixel/uResolution;
    rgb=vec3(filmLut(rgb.r),filmLut(rgb.g),filmLut(rgb.b));
    rgb=rgb*vec3(uRed,uGreen,uBlue)+vec3(0.10,0.02,-0.08)*uWarmth;
    rgb=(rgb-0.5)*uContrast+0.5;
    float luma=dot(rgb,vec3(0.2126,0.7152,0.0722));
    rgb=mix(vec3(luma),rgb,uSaturation);
    rgb=mix(rgb,vec3(0.55,0.52,0.48),uFade);
    float tick=floor(uTime*uGrainSpeed);
    float grain=filmHash(floor(pixel/uGrainScale),tick)*uGrainIntensity;
    rgb+=grain*max(1.0-2.0*abs(luma-0.5),0.35);
    float edge=clamp(length((uv-0.5)*1.4),0.0,1.0);
    rgb*=1.0-uVignette*edge*edge;
    float leak=pow(max(0.0,1.0-uv.x*3.0),3.0)*(0.7+0.3*sin(uTime*0.8));
    rgb+=uLeak*leak*vec3(0.8,0.18,0.04);
    vec2 cell=floor(pixel/70.0);
    float dust=step(0.97,filmHash(cell,floor(tick/48.0)))*step(length(mod(pixel,70.0)-vec2(35.0)),1.4);
    float scratch=step(0.997,filmHash(vec2(floor(pixel.x/2.0),7.0),floor(uTime*2.0)));
    rgb+=dust*uDust*0.65+scratch*uScratches*0.35;
    rgb*=1.0-uScanlines*(0.5+0.5*sin(pixel.y*3.14159))*0.22;
    rgb*=1.0+uFlicker*sin(uTime*24.0);
    if(uFrame>2.5 && (uv.x<0.045 || uv.x>0.955 || uv.y<0.04 || uv.y>0.84))rgb=vec3(0.94,0.92,0.86);
    else if(uFrame>0.5 && uFrame<1.5 && (uv.x<0.025 || uv.x>0.975))rgb=vec3(0.015);
    else if(uFrame>1.5 && uFrame<2.5 && (uv.y<0.012 || uv.y>0.988))rgb=vec3(0.01);
    return clamp(rgb,0.0,1.0);
}
