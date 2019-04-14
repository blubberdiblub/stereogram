'use strict';

/**
 * Load shader source code from a web site resource
 *
 * @param {string} url
 *
 * @returns {Promise<string>}
 */
async function loadShader(url) { // jshint ignore:line
    /** @type {Response} */
    const response = await fetch(url, {cache: 'default'}); // jshint ignore:line

    if (!response.ok) {
        throw Error(`Error fetching ${url}: ${response.status} ${response.statusText}`);
    }

    return await response.text(); // jshint ignore:line
}

/**
 * Compile a shader from source code
 *
 * @param {WebGLRenderingContext} gl
 * @param {GLenum} type
 * @param {string} source
 *
 * @returns {Promise<WebGLShader>}
 */
async function createShader(gl, type, source) { // jshint ignore:line
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

const _vertexShaderCache = new Map();

/**
 * Create a vertex shader from a URL
 *
 * @param {WebGLRenderingContext} gl
 * @param {string} url
 *
 * @returns {Promise<WebGLShader>}
 */
async function createVertexShader(gl, url) { // jshint ignore:line
    const normalizedURL = new URL(url, window.location.href);
    // let source = createVertexShader._cache.get(normalizedURL);

    const source = await loadShader(url); // jshint ignore:line

    return await createShader(gl, gl.VERTEX_SHADER, source); // jshint ignore:line
}

const _fragmentShaderCache = new Map();

/**
 * Create a fragment shader from a URL
 *
 * @param {WebGLRenderingContext} gl
 * @param {string} url
 *
 * @returns {Promise<WebGLShader>}
 */
async function createFragmentShader(gl, url) { // jshint ignore:line
    const normalizedURL = new URL(url, window.location.href);
    // let source = createFragmentShader._cache.get(normalizedURL);

    const source = await loadShader(url); // jshint ignore:line

    return await createShader(gl, gl.FRAGMENT_SHADER, source); // jshint ignore:line
}

/**
 * Create a shader program from compiled vertex and fragment shaders
 *
 * @param {WebGLRenderingContext} gl
 * @param {WebGLShader[]} shaders
 *
 * @returns {Promise<WebGLProgram>}
 */
async function createProgram(gl, shaders) { // jshint ignore:line
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
 * @returns {Promise<WebGLProgram>}
 */
export async function compileAndLinkProgram(gl, vertexShaderUrl, fragmentShaderUrl) { // jshint ignore:line
    const shaders = [];

    // noinspection ES6MissingAwait
    const vertexShaderPromise = createVertexShader(gl, vertexShaderUrl); // jshint ignore:line
    // noinspection ES6MissingAwait
    const fragmentShaderPromise = createFragmentShader(gl, fragmentShaderUrl); // jshint ignore:line

    try {
        shaders.push(await vertexShaderPromise); // jshint ignore:line
        shaders.push(await fragmentShaderPromise); // jshint ignore:line
        return await createProgram(gl, shaders); // jshint ignore:line
    }
    catch (e) {
        for (const shader of shaders) {
            gl.deleteShader(shader);
        }

        throw e;
    }
}
