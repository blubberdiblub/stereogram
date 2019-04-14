'use strict';

/**
 * Load shader source code from a web site resource
 *
 * @param {string} url
 * @param {string} mime
 *
 * @returns {string}
 */
function loadShader(url, mime) {
    /** @type {XMLHttpRequest} */
    const request = new XMLHttpRequest();
    request.open('GET', url, false);
    request.overrideMimeType(mime || 'text/plain');
    request.setRequestHeader('Cache-Control', 'no-cache');
    request.send(null);

    if (request.status !== loadShader._HTTP_STATUS_OK) {
        throw Error(request.statusText);
    }

    return request.responseText;
}

loadShader._HTTP_STATUS_OK = 200;

/**
 * Compile a shader from source code
 *
 * @param {WebGLRenderingContext} gl
 * @param {GLenum} type
 * @param {string} source
 *
 * @returns {WebGLShader}
 */
function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const msg = gl.getShaderInfoLog(shader);
        gl.deleteShader(shader);
        throw Error(msg);
    }

    return shader;
}

/**
 * Create a vertex shader from a URL
 *
 * @param {WebGLRenderingContext} gl
 * @param {string} url
 *
 * @returns {WebGLShader}
 */
function createVertexShader(gl, url) {
    const normalizedURL = new URL(url, window.location.href);
    let source = createVertexShader._cache.get(normalizedURL);

    if (source === undefined) {
        source = loadShader(url, 'x-shader/x-vertex');
        createVertexShader._cache.set(normalizedURL, source);
    }

    return createShader(gl, gl.VERTEX_SHADER, source);
}

createVertexShader._cache = new Map();

/**
 * Create a fragment shader from a URL
 *
 * @param {WebGLRenderingContext} gl
 * @param {string} url
 *
 * @returns {WebGLShader}
 */
function createFragmentShader(gl, url) {
    const normalizedURL = new URL(url, window.location.href);
    let source = createFragmentShader._cache.get(normalizedURL);

    if (source === undefined) {
        source = loadShader(url, 'x-shader/x-fragment');
        createFragmentShader._cache.set(normalizedURL, source);
    }

    return createShader(gl, gl.FRAGMENT_SHADER, source);
}

createFragmentShader._cache = new Map();

/**
 * Create a shader program from compiled vertex and fragment shaders
 *
 * @param {WebGLRenderingContext} gl
 * @param {WebGLShader[]} shaders
 *
 * @returns {WebGLProgram}
 */
function createProgram(gl, shaders) {
    const program = gl.createProgram();

    for (const shader of shaders) {
        gl.attachShader(program, shader);
    }

    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        const msg = gl.getProgramInfoLog(program);
        gl.deleteProgram(program);
        throw Error(msg);
    }

    gl.validateProgram(program);
    if (!gl.getProgramParameter(program, gl.VALIDATE_STATUS)) {
        const msg = gl.getProgramInfoLog(program);
        gl.deleteProgram(program);
        throw Error(msg);
    }

    return program;
}

/**
 * Create a shader program from vertex and fragment shader URLs
 *
 * @param {WebGLRenderingContext} gl
 * @param {string} vertexShaderUrl
 * @param {string} fragmentShaderUrl
 *
 * @returns {WebGLProgram}
 */
export function compileAndLinkProgram(gl, vertexShaderUrl, fragmentShaderUrl) {
    const shaders = [];

    try {
        shaders.push(createVertexShader(gl, vertexShaderUrl));
        shaders.push(createFragmentShader(gl, fragmentShaderUrl));
        return createProgram(gl, shaders);
    }
    catch (e) {
        for (const shader of shaders) {
            gl.deleteShader(shader);
        }

        throw e;
    }
}
