'use strict';

function fragmentSource() {
    
    const fsSource = `

        #extension GL_EXT_draw_buffers : require

        #ifdef GL_FRAGMENT_PRECISION_HIGH
            precision highp float;
        #else
            precision mediump float;
        #endif

        uniform vec2 u_resolution;
        uniform float u_time;
        uniform float u_delta;
        uniform vec3 u_input_position;
        uniform float u_force;
        uniform sampler2D u_texture0;
        uniform sampler2D u_texture1;
        uniform sampler2D u_texture2;

        // Buffering optimisations learnt and understood from excellent article by Nop Jiarathanakul
        // http://nopjia.blogspot.com/2014/06/webgl-gpu-particles.html
        // Curl noise taken verbatim from The Spirit by Edan Kwan
        // http://www.edankwan.com/experiments/the-spirit/

        vec4 mod289(vec4 x) {
            return x - floor(x * (1.0 / 289.0)) * 289.0;
        }
        
        float mod289(float x) {
            return x - floor(x * (1.0 / 289.0)) * 289.0;
        }
        
        vec4 permute(vec4 x) {
            return mod289(((x * 34.0) + 1.0) * x);
        }
        
        float permute(float x) {
            return mod289(((x * 34.0) + 1.0) * x);
        }
        
        vec4 taylorInvSqrt(vec4 r) {
            return 1.79284291400159 - 0.85373472095314 * r;
        }
        
        float taylorInvSqrt(float r) {
            return 1.79284291400159 - 0.85373472095314 * r;
        }
        
        vec4 grad4(float j, vec4 ip) {
            const vec4 ones = vec4(1.0, 1.0, 1.0, -1.0);
            vec4 p,s;
        
            p.xyz = floor( fract (vec3(j) * ip.xyz) * 7.0) * ip.z - 1.0;
            p.w = 1.5 - dot(abs(p.xyz), ones.xyz);
            s = vec4(lessThan(p, vec4(0.0)));
            p.xyz = p.xyz + (s.xyz * 2.0 - 1.0) * s.www;
        
            return p;
        }
        
        #define F4 0.309016994374947451
        
        vec4 simplexNoiseDerivatives (vec4 v) {

            const vec4  C = vec4( 0.138196601125011,0.276393202250021,0.414589803375032,-0.447213595499958);
        
            vec4 i  = floor(v + dot(v, vec4(F4)));
            vec4 x0 = v - i + dot(i, C.xxxx);
        
            vec4 i0;
            vec3 isX = step(x0.yzw, x0.xxx);
            vec3 isYZ = step(x0.zww, x0.yyz);
            i0.x = isX.x + isX.y + isX.z;
            i0.yzw = 1.0 - isX;
            i0.y += isYZ.x + isYZ.y;
            i0.zw += 1.0 - isYZ.xy;
            i0.z += isYZ.z;
            i0.w += 1.0 - isYZ.z;
        
            vec4 i3 = clamp(i0, 0.0, 1.0);
            vec4 i2 = clamp(i0 - 1.0, 0.0, 1.0);
            vec4 i1 = clamp(i0 - 2.0, 0.0, 1.0);
        
            vec4 x1 = x0 - i1 + C.xxxx;
            vec4 x2 = x0 - i2 + C.yyyy;
            vec4 x3 = x0 - i3 + C.zzzz;
            vec4 x4 = x0 + C.wwww;
        
            i = mod289(i);
            float j0 = permute(permute(permute(permute(i.w) + i.z) + i.y) + i.x);
            vec4 j1 = permute(permute(permute(permute(
                     i.w + vec4(i1.w, i2.w, i3.w, 1.0))
                   + i.z + vec4(i1.z, i2.z, i3.z, 1.0))
                   + i.y + vec4(i1.y, i2.y, i3.y, 1.0))
                   + i.x + vec4(i1.x, i2.x, i3.x, 1.0));
        
            vec4 ip = vec4(1.0/294.0, 1.0/49.0, 1.0/7.0, 0.0) ;
        
            vec4 p0 = grad4(j0,   ip);
            vec4 p1 = grad4(j1.x, ip);
            vec4 p2 = grad4(j1.y, ip);
            vec4 p3 = grad4(j1.z, ip);
            vec4 p4 = grad4(j1.w, ip);
        
            vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
            p0 *= norm.x;
            p1 *= norm.y;
            p2 *= norm.z;
            p3 *= norm.w;
            p4 *= taylorInvSqrt(dot(p4,p4));
        
            vec3 values0 = vec3(dot(p0, x0), dot(p1, x1), dot(p2, x2)); //value of contributions from each corner at point
            vec2 values1 = vec2(dot(p3, x3), dot(p4, x4));
        
            vec3 m0 = max(0.5 - vec3(dot(x0,x0), dot(x1,x1), dot(x2,x2)), 0.0); //(0.5 - x^2) where x is the distance
            vec2 m1 = max(0.5 - vec2(dot(x3,x3), dot(x4,x4)), 0.0);
        
            vec3 temp0 = -6.0 * m0 * m0 * values0;
            vec2 temp1 = -6.0 * m1 * m1 * values1;
        
            vec3 mmm0 = m0 * m0 * m0;
            vec2 mmm1 = m1 * m1 * m1;
        
            float dx = temp0[0] * x0.x + temp0[1] * x1.x + temp0[2] * x2.x + temp1[0] * x3.x + temp1[1] * x4.x + mmm0[0] * p0.x + mmm0[1] * p1.x + mmm0[2] * p2.x + mmm1[0] * p3.x + mmm1[1] * p4.x;
            float dy = temp0[0] * x0.y + temp0[1] * x1.y + temp0[2] * x2.y + temp1[0] * x3.y + temp1[1] * x4.y + mmm0[0] * p0.y + mmm0[1] * p1.y + mmm0[2] * p2.y + mmm1[0] * p3.y + mmm1[1] * p4.y;
            float dz = temp0[0] * x0.z + temp0[1] * x1.z + temp0[2] * x2.z + temp1[0] * x3.z + temp1[1] * x4.z + mmm0[0] * p0.z + mmm0[1] * p1.z + mmm0[2] * p2.z + mmm1[0] * p3.z + mmm1[1] * p4.z;
            float dw = temp0[0] * x0.w + temp0[1] * x1.w + temp0[2] * x2.w + temp1[0] * x3.w + temp1[1] * x4.w + mmm0[0] * p0.w + mmm0[1] * p1.w + mmm0[2] * p2.w + mmm1[0] * p3.w + mmm1[1] * p4.w;
        
            return vec4(dx, dy, dz, dw) * 49.0;
        }
        
        vec3 curl(vec3 p, float noiseTime, float persistence) {
            
            vec4 xNoisePotentialDerivatives = vec4(0.0);
            vec4 yNoisePotentialDerivatives = vec4(0.0);
            vec4 zNoisePotentialDerivatives = vec4(0.0);
            
            for (int i = 0; i < 3; ++i) {
        
                float twoPowI = pow(2.0, float(i));
                float scale = 0.5 * twoPowI * pow(persistence, float(i));
        
                xNoisePotentialDerivatives += simplexNoiseDerivatives(vec4(p * twoPowI, noiseTime)) * scale;
                yNoisePotentialDerivatives += simplexNoiseDerivatives(vec4((p + vec3(123.4, 129845.6, -1239.1)) * twoPowI, noiseTime)) * scale;
                zNoisePotentialDerivatives += simplexNoiseDerivatives(vec4((p + vec3(-9519.0, 9051.0, -123.0)) * twoPowI, noiseTime)) * scale;
            }
        
            return vec3(
                zNoisePotentialDerivatives[1] - yNoisePotentialDerivatives[2],
                xNoisePotentialDerivatives[2] - zNoisePotentialDerivatives[0],
                yNoisePotentialDerivatives[0] - xNoisePotentialDerivatives[1]
            );
        }
        //compact 2 axis rotation
        mat2 rot(float x) {return mat2(cos(x), sin(x), -sin(x), cos(x));}

        vec4 dfScene(vec3 rp) {

            rp.xy *= rot(u_time * 0.3);
            rp.yz *= rot(u_time * 1.0);

            float br = 0.1;
            float r = 3.4;

            vec3 ball = vec3(0.0, r, 0.0);
            float msd = length(ball - rp) - br;
            vec3 gd = normalize(ball - rp);

            ball = vec3(r, 0.0, 0.0);
            float gt = length(ball - rp) - br;
            if (gt < msd) {
                msd = gt;
                gd = normalize(ball - rp);
            }

            ball = vec3(0.0, -r, 0.0);
            gt = length(ball - rp) - br;
            if (gt < msd) {
                msd = gt;
                gd = normalize(ball - rp);
            }

            ball = vec3(-r, 0.0, 0.0);
            gt = length(ball - rp) - br;
            if (gt < msd) {
                msd = gt;
                gd = normalize(ball - rp);
            }

            ball = vec3(0.0, 0.0, r);
            gt = length(ball - rp) - br;
            if (gt < msd) {
                msd = gt;
                gd = normalize(ball - rp);
            }

            ball = vec3(0.0, 0.0, -r);
            gt = length(ball - rp) - br;
            if (gt < msd) {
                msd = gt;
                gd = normalize(ball - rp);
            }

            return vec4(gd, msd);
        }

        void main() {

            //handle particle updates
            vec2 uv = gl_FragCoord.xy / u_resolution.xy;

            vec3 position = texture2D(u_texture0, uv).rgb;
            vec3 velocity = texture2D(u_texture1, uv).rgb;
            vec3 colour = texture2D(u_texture2, uv).rgb;

            //TODO: mouse interactions

            position += velocity * u_delta;
            velocity = 0.99 * velocity;

            vec4 grav = dfScene(position);
            velocity += grav.xyz / (1.0 + grav.w * grav.w * 4.0) * 0.08;

            vec3 finalPosition = position + curl(position * 10.0, u_time, 0.5) * 0.01;
            
            colour = vec3(0.0, 0.0, 1.0) * exp(-grav.w * 0.5);
            colour += vec3(0.6, 0.4, 1.0) * length(velocity) * 2.0;
            
            // write out data
            gl_FragData[0] = vec4(finalPosition, 1.0);
            gl_FragData[1] = vec4(velocity, 1.0);
            gl_FragData[2] = vec4(colour, 1.0);
        }
    `;
    
    return fsSource;
};
    
module.exports = {
    fragmentSource: fragmentSource
};