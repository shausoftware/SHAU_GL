'use strict';

const cat1 = require('../../static/images/cat1.jpg');
const cat2 = require('../../static/images/cat2.jpg');
const cat3 = require('../../static/images/cat3.jpg');
const cat4 = require('../../static/images/cat4.jpg');

const ShauGL = require('../../shaugl3D'); //general 3D utils
const ShauRMGL = require('../../shaurmgl'); //raymarching utils

import SimpleVertexShader from '../../shaders/simple_vertex_shader';
import HomeFragmentShader from '../../content/shaders/home_fragment_shader';

function getTitle() {
    return undefined;
}

function getDescription() {
    var description = "This is the third incarnation of my website SHAUSTUFF and this time around the focus is on WebGL." +        
                      " All of the code to this site is available from my github repository" +
                      " should you be interested in such things (see links). Now on to business..." +
                      " some pictures of cats (rendered using WebGL).";
    return description;
}

function getSnapshotImage() {
    return cat1;
}

function initGLContent(gl, mBuffExt) {

    var programInfos = undefined;
    var framebuffers = [];

    const vsSource = SimpleVertexShader.vertexSource();
    const fsSource = HomeFragmentShader.fragmentSource();
    const shaderProgram = ShauGL.initShaderProgram(gl, vsSource, fsSource);
    const programInfo = {
        program: shaderProgram,
        attribLocations: {
            positionAttributeLocation: gl.getAttribLocation(shaderProgram, 'a_position')
        },
        uniformLocations: {
            textureUniformLocation: gl.getUniformLocation(shaderProgram, 'u_texture'),
            vignetteUniformLocation: gl.getUniformLocation(shaderProgram, 'u_vignette'),
            resolutionUniformLocation: gl.getUniformLocation(shaderProgram, 'u_resolution'),
            timeUniformLocation: gl.getUniformLocation(shaderProgram, 'u_time')
        }
    };
    programInfos = {renderProgramInfo: programInfo};

    var buffers = ShauRMGL.initBuffers(gl);
    
    var textureInfos = [
        ShauGL.loadImageAndInitTextureInfo(gl, cat1),
        ShauGL.loadImageAndInitTextureInfo(gl, cat2),
        ShauGL.loadImageAndInitTextureInfo(gl, cat3),
        ShauGL.loadImageAndInitTextureInfo(gl, cat4)
    ];

    return {programInfos: programInfos,
            textureInfos: textureInfos,
            buffers: buffers,
            framebuffers: framebuffers};
}

function loadGLContent(gl, mBuffExt, content) {
    //already fully initialised
    //do nothing
    return new Promise(resolve => {
        resolve(content);
    });
}

function renderGLContent(gl, content, dt) {

    // 4 images
    var vignette = 1.0;
    var cat = content.textureInfos[0];
    var ct = dt % 40.0; //time to cycle through 4 images
    var ctf = dt % 10.0; //time to cycle 1 image

    if (ctf < 1.0) {
        vignette = ctf;
    } else if (ctf > 9.0) {
        vignette = 10.0 - ctf;
    } else {
        vignette = 1.0;
    }

    if (ct > 10.0 && ct <= 20.0) {
        cat = content.textureInfos[1];
    } else if (ct > 20.0 && ct <= 30.0) {
        cat = content.textureInfos[2];
    } else if (ct > 30.0) {
        cat = content.textureInfos[3];
    }

    var programInfo = content.programInfos.renderProgramInfo; 

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(0, 0, 0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(programInfo.program);

    gl.bindBuffer(gl.ARRAY_BUFFER, content.buffers.screenInsetBuffer);
    gl.enableVertexAttribArray(programInfo.attribLocations.positionAttributeLocation);
    gl.vertexAttribPointer(programInfo.attribLocations.positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

    gl.bindTexture(gl.TEXTURE_2D, cat.texture);
    gl.uniform1i(programInfo.uniformLocations.textureUniformLocation, 0);
    gl.uniform2f(programInfo.uniformLocations.resolutionUniformLocation, gl.canvas.width, gl.canvas.height);
    gl.uniform1f(programInfo.uniformLocations.timeUniformLocation, dt);
    gl.uniform1f(programInfo.uniformLocations.vignetteUniformLocation, vignette);

    gl.drawArrays(gl.TRIANGLES, 0, 6);

    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.disableVertexAttribArray(programInfo.attribLocations.positionAttributeLocation);
    gl.useProgram(null);
}

module.exports = {
    getTitle: getTitle,
    getDescription: getDescription,
    getSnapshotImage: getSnapshotImage,
    initGLContent: initGLContent,
    loadGLContent: loadGLContent,
    renderGLContent: renderGLContent
};