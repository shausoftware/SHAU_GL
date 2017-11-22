'use strict';

const React = require('react');
var glm = require('gl-matrix');

const noiseSrc = require('../static/images/colournoise.png');
const teapotObjSrc = require('../static/teapot.obj');

import ShauGL from '../shaugl3D';
import TeapotGL from './teapotgl';
import TeapotVertexShader from '../shaders/teapot_vertex_shader';
import TeapotFragmentShader from '../shaders/teapot_fragment_shader';
import VertexShader from '../shaders/vertex_shader';
import VignetteFragmentShader from '../shaders/vignette_fragment_shader';

var animId = undefined;

export default class Teapot extends React.Component {

    constructor(props) {
        super(props);
    }

    componentDidMount() {

        const gl = this.refs.glCanvas.getContext('webgl');
        
        if (!gl) {
            alert('Please update to a web browser that supports WebGL.');
            return;
        }

        ShauGL.checkExtensions(gl);
        
        var shadowDepthTextureSize = 2048;
        var lightPosition = [-2.0, 10.0, 1.0];
        var camera = {
            position: [0.0, 5.0, 10.0],
            target: [0.0, 0.0, 0.0],
            near: 0.01,
            far: 400.0,
            fov: 45.0,
            aspectRatio: gl.canvas.width / gl.canvas.height
        };

        var lightProjectionMatrix = glm.mat4.create();
        glm.mat4.ortho(lightProjectionMatrix,                   
                        -40.0,
                        40.0,
                        -40.0,
                        40.0,
                        -40.0, 
                        80.0);
        
        var cameraProjectionMatrix = glm.mat4.create();
        glm.mat4.perspective(cameraProjectionMatrix,
                                camera.fov,
                                camera.aspectRatio,
                                camera.near,
                                camera.far);
        
        //teapot program
        const teapotVsSource = TeapotVertexShader.vertexSource();
        const teapotFsSource = TeapotFragmentShader.fragmentSource();
        const teapotShaderProgram = ShauGL.initShaderProgram(gl, teapotVsSource, teapotFsSource);
        const teapotProgramInfo = {
            program: teapotShaderProgram,
            attribLocations: {
                positionAttributeLocation: gl.getAttribLocation(teapotShaderProgram, 'a_position'),
                normalAttributeLocation: gl.getAttribLocation(teapotShaderProgram, 'a_normal')
            },
            uniformLocations: {
                modelViewMatrixUniformLocation: gl.getUniformLocation(teapotShaderProgram, 'u_model_view_matrix'),
                projectionMatrixUniformLocation: gl.getUniformLocation(teapotShaderProgram, 'u_projection_matrix'),
                smModelViewMatrixUniformLocation: gl.getUniformLocation(teapotShaderProgram, 'u_sm_model_view_matrix'),
                smProjectionMatrixUniformLocation: gl.getUniformLocation(teapotShaderProgram, 'u_sm_projection_matrix'),
                normalsMatrixUniformLocation: gl.getUniformLocation(teapotShaderProgram, 'u_normals_matrix'),
                depthColourTextureUniformLocation: gl.getUniformLocation(teapotShaderProgram, 'u_depth_colour_texture'),
                colourUniformLocation: gl.getUniformLocation(teapotShaderProgram, 'u_colour'),
                lightPositionUniformLocation: gl.getUniformLocation(teapotShaderProgram, 'u_light_position'),
                ssaoTextureUniformLocation: gl.getUniformLocation(teapotShaderProgram, 'u_ssao_texture')
            }
        }

        //vignette
        const vVsSource = VertexShader.vertexSource();
        const vFsSource = VignetteFragmentShader.fragmentSource();
        const vShaderProgram = ShauGL.initShaderProgram(gl, vVsSource, vFsSource);
        const vProgramInfo = {
            program: vShaderProgram,
            attribLocations: {
                positionAttributeLocation: gl.getAttribLocation(vShaderProgram, 'a_position')
            },
            uniformLocations: {
                vignetteTextureUniformLocation: gl.getUniformLocation(vShaderProgram, 'u_vignette_texture'),
                resolutionUniformLocation: gl.getUniformLocation(vShaderProgram, 'u_resolution')
            }
        };

        //shadow program
        const shadowMapProgramInfo = ShauGL.initShadowProgram(gl);

        //ssao program
        const ssaoProgramInfo = ShauGL.initSSAOProgram(gl);

        var buffers = undefined;
        var shadowMapFramebuffer = ShauGL.initDepthFramebuffer(gl, shadowDepthTextureSize, shadowDepthTextureSize);
        var ssaoFramebuffer = ShauGL.initDepthFramebuffer(gl, gl.canvas.width, gl.canvas.height);
        var renderFramebuffer = ShauGL.initFramebuffer(gl, gl.canvas.width, gl.canvas.height);
        var viewCameraMatrices = ShauGL.setupCamera(camera.position, camera.target, cameraProjectionMatrix);
        var shadowMapCameraMatrices = ShauGL.setupCamera(lightPosition, camera.target, lightProjectionMatrix);
    
        var then = 0;
        function renderFrame(now) {

            now *= 0.001; // convert to seconds
            const deltaTime = now - then;
            then = now;
            
            // Draw to our off screen drawing buffer for shadow map
            gl.bindFramebuffer(gl.FRAMEBUFFER, shadowMapFramebuffer.framebuffer);
            TeapotGL.drawShadowMap(gl, 
                                    shadowMapProgramInfo, 
                                    buffers, 
                                    shadowMapCameraMatrices,  
                                    shadowDepthTextureSize);
            //*/
            
            //ssao depth to off screen buffer
            gl.bindFramebuffer(gl.FRAMEBUFFER, ssaoFramebuffer.framebuffer);
            TeapotGL.drawSSAO(gl, ssaoProgramInfo, buffers, viewCameraMatrices, camera);
            //*/

            //draw scene
            gl.bindFramebuffer(gl.FRAMEBUFFER, renderFramebuffer.framebuffer);
            //gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            TeapotGL.drawScene(gl, 
                                teapotProgramInfo, 
                                buffers, 
                                viewCameraMatrices,
                                shadowMapCameraMatrices,
                                shadowMapFramebuffer.texture,
                                ssaoFramebuffer.texture,
                                lightPosition);
            //*/

            //vignette
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            TeapotGL.vignette(gl, vProgramInfo, buffers, renderFramebuffer.texture);
       
            animId = requestAnimationFrame(renderFrame);
        }

        var useMaterials = false;
        TeapotGL.loadMesh(teapotObjSrc, useMaterials).then(mesh => {
            console.log('MESH LOADED');
            buffers = TeapotGL.initBuffers(gl, mesh);
            animId = requestAnimationFrame(renderFrame);        
        });
    }

    componentWillUnmount() {
        window.cancelAnimationFrame(animId);        
    }

    render() {
        return (
            <div>
                <p className='text-center'>
                    <canvas ref='glCanvas' width='640' height='480'></canvas>
                </p>    
            </div>
        );
    }
}