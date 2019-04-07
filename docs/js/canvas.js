window.addEventListener('load', () => {
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
    function compileAndLinkProgram(gl, vertexShaderUrl, fragmentShaderUrl) {
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

    /**
     * 4x4 matrix for coordinate transformations
     *
     * Note that when you lay out the values consecutively, it will look as
     * though they were transposed from how you write them mathematically or
     * how the Khronos(R) Group OpenGL documentation presents them.
     *
     * In reality this is just a convention to be able to deal with them more
     * efficiently. But you need to be aware of it when reading matrix value
     * or writing code.
     */
    class Mat4 {
        /**
         * @param {(Mat4|number[])} [data]
         */
        constructor(data) {
            if (data === undefined) {
                this.data = Mat4._IDENTITY.slice();
                return;
            }

            if (data instanceof Mat4) {
                this.data = data.data.slice();
                return;
            }

            if (!Array.isArray(data)) {
                throw new Error("wrong type");
            }

            if (data.length !== 16) {
                throw new Error("expected length 16");
            }

            this.data = new Float32Array(data);
        }

        /**
         * Create a new scaling matrix
         *
         * @param {number} k
         *
         * @returns {Mat4}
         */
        static scaling(k) {
            return new Mat4([
                 k , 0.0, 0.0, 0.0,
                0.0,  k , 0.0, 0.0,
                0.0, 0.0,  k , 0.0,
                0.0, 0.0, 0.0, 1.0,
            ]);
        }

        /**
         * Create a new translation matrix
         *
         * @param {number} [x=0.0]
         * @param {number} [y=0.0]
         * @param {number} [z=0.0]
         *
         * @returns {Mat4}
         */
        static translation(x=0.0, y=0.0, z=0.0) {
            return new Mat4([
                1.0, 0.0, 0.0, 0.0,
                0.0, 1.0, 0.0, 0.0,
                0.0, 0.0, 1.0, 0.0,
                 x ,  y ,  z , 1.0,
            ]);
        }

        /**
         * Create a new rotation matrix around the X axis
         *
         * @param {number} angle
         *
         * @returns {Mat4}
         */
        static rotationX(angle) {
            const rad = angle * Math.PI / 180.0;
            const c = Math.cos(rad);
            const s = Math.sin(rad);

            return new Mat4([
                1.0, 0.0, 0.0, 0.0,
                0.0,  c , -s , 0.0,
                0.0,  s ,  c , 0.0,
                0.0, 0.0, 0.0, 1.0,
            ]);
        }

        /**
         * Create a new rotation matrix around the Y axis
         *
         * @param {number} angle
         *
         * @returns {Mat4}
         */
        static rotationY(angle) {
            const rad = angle * Math.PI / 180.0;
            const c = Math.cos(rad);
            const s = Math.sin(rad);

            return new Mat4([
                 c , 0.0,  s , 0.0,
                0.0, 1.0, 0.0, 0.0,
                -s , 0.0,  c , 0.0,
                0.0, 0.0, 0.0, 1.0,
            ]);
        }

        /**
         * Create a new rotation matrix around the Z axis
         *
         * @param {number} angle
         *
         * @returns {Mat4}
         */
        static rotationZ(angle) {
            const rad = angle * Math.PI / 180.0;
            const c = Math.cos(rad);
            const s = Math.sin(rad);

            return new Mat4([
                 c , -s , 0.0, 0.0,
                 s ,  c , 0.0, 0.0,
                0.0, 0.0, 1.0, 0.0,
                0.0, 0.0, 0.0, 1.0,
            ]);
        }

        /**
         * Return the transposition of this matrix
         *
         * @returns {Mat4}
         */
        transposition() {
            const data = this.data;

            return new Mat4([
                data[0], data[4], data[ 8], data[12],
                data[1], data[5], data[ 9], data[13],
                data[2], data[6], data[10], data[14],
                data[3], data[7], data[11], data[15],
            ]);
        }

        /**
         * Return the result of matrix multiplication
         * applied to this and a second matrix
         *
         * @param {Mat4} a
         * @param {Mat4} b
         *
         * @returns {Mat4}
         */
        static mul(a, b) {
            const [
                a00, a10, a20, a30,
                a01, a11, a21, a31,
                a02, a12, a22, a32,
                a03, a13, a23, a33,
            ] = a.data;

            const [
                b00, b10, b20, b30,
                b01, b11, b21, b31,
                b02, b12, b22, b32,
                b03, b13, b23, b33,
            ] = b.data;

            return new Mat4([
                a00 * b00 + a01 * b10 + a02 * b20 + a03 * b30,
                a10 * b00 + a11 * b10 + a12 * b20 + a13 * b30,
                a20 * b00 + a21 * b10 + a22 * b20 + a23 * b30,
                a30 * b00 + a31 * b10 + a32 * b20 + a33 * b30,

                a00 * b01 + a01 * b11 + a02 * b21 + a03 * b31,
                a10 * b01 + a11 * b11 + a12 * b21 + a13 * b31,
                a20 * b01 + a21 * b11 + a22 * b21 + a23 * b31,
                a30 * b01 + a31 * b11 + a32 * b21 + a33 * b31,

                a00 * b02 + a01 * b12 + a02 * b22 + a03 * b32,
                a10 * b02 + a11 * b12 + a12 * b22 + a13 * b32,
                a20 * b02 + a21 * b12 + a22 * b22 + a23 * b32,
                a30 * b02 + a31 * b12 + a32 * b22 + a33 * b32,

                a00 * b03 + a01 * b13 + a02 * b23 + a03 * b33,
                a10 * b03 + a11 * b13 + a12 * b23 + a13 * b33,
                a20 * b03 + a21 * b13 + a22 * b23 + a23 * b33,
                a30 * b03 + a31 * b13 + a32 * b23 + a33 * b33,
            ]);
        }
    }

    Mat4._IDENTITY = new Float32Array([
        1.0, 0.0, 0.0, 0.0,
        0.0, 1.0, 0.0, 0.0,
        0.0, 0.0, 1.0, 0.0,
        0.0, 0.0, 0.0, 1.0,
    ]);

    /**
     * Buffer usage modes to help WebGL make optimization decisions
     *
     * They are made available independent from a WebGL context
     * so they can be used with more abstract scene objects.
     *
     * @enum {number}
     * @readonly
     */
    const bufferUsage = {
        STATIC_DRAW: 1,
        DYNAMIC_DRAW: 2,
        STREAM_DRAW: 3,

        /**
         * Determine WebGL usage for optimizing buffers
         *
         * @param {WebGLRenderingContext} gl
         * @param {bufferUsage} usage
         *
         * @returns {GLenum}
         */
        toGLUsage(gl, usage) {
            switch (usage) {
                case bufferUsage.STATIC_DRAW:
                    return gl.STATIC_DRAW;
                case bufferUsage.DYNAMIC_DRAW:
                    return gl.DYNAMIC_DRAW;
                case bufferUsage.STREAM_DRAW:
                    return gl.STREAM_DRAW;
                default:
                    throw Error("unknown bufferUsage");
            }
        },
    };

    /**
     * Draw modes which determine how indices or attributes are
     * structured into drawing primitives
     *
     * The are subsequently translated into their respective WebGL modes.
     *
     * @enum {number}
     * @readonly
     */
    const drawMode = {
        TRIANGLES: 1,
        TRIANGLE_FAN: 2,
        TRIANGLE_STRIP: 3,

        /**
         * Determine WebGL mode for drawing elements
         *
         * @param {WebGLRenderingContext} gl
         * @param {drawMode} mode
         *
         * @returns {GLenum}
         */
        toGLMode(gl, mode) {
            switch (mode) {
                case drawMode.TRIANGLES:
                    return gl.TRIANGLES;
                case drawMode.TRIANGLE_FAN:
                    return gl.TRIANGLE_FAN;
                case drawMode.TRIANGLE_STRIP:
                    return gl.TRIANGLE_STRIP;
                default:
                    throw Error("unknown drawMode");
            }
        }
    };

    /**
     * Render command in the context of an object
     *
     * For the user of the class, this is fairly abstract, while the actual
     * implementation can actually consist of any number of function calls.
     *
     * When a RenderContext select a command for inclusion, it will prepare
     * commands tailored to the RenderObject in that particular context.
     */
    class RenderCommand {
        /**
         * @param {Object} properties
         * @property {number} [inclusionFlags=~0]
         */
        constructor({inclusionFlags=~0}) {
            this.inclusionFlags = inclusionFlags;
        }

        /**
         * Prepare concrete commands for an object in a RenderContext
         *
         * @param {RenderObject} renderObject
         *
         * @returns {function(WebGLRenderingContext):void[]}
         */
        prepare(renderObject) {
            throw(Error("use a concrete implementation"));
        }
    }

    class CmdSetAttrib extends RenderCommand {
        /**
         * @param {string} attribName
         * @param {string} bufferName
         * @param {Object} properties
         * @property {number} size
         * @property {boolean} [normalized=false]
         * @property {number} [stride=0]
         * @property {number} [offset=0]
         */
        constructor(attribName, bufferName, {size, normalized=false, stride=0, offset=0, ...rest}={}) {
            super(rest);

            this.attribName = attribName;
            this.bufferName = bufferName;
            this.size = size;
            this.normalized = normalized;
            this.stride = stride;
            this.offset = offset;
        }

        prepare(renderObject) {
            const attribProps = renderObject.attribs.get(this.attribName);
            if (attribProps === undefined) {
                return [];
            }

            const {index} = attribProps;
            const {buffer, byteSize, type} = renderObject.attribBuffers.get(this.bufferName);
            const byteStride = this.stride * byteSize;
            const byteOffset = this.offset * byteSize;

            return [CmdSetAttrib._cmd(index, buffer, this.size, type, this.normalized, byteStride, byteOffset)];
        }

        static _cmd(index, buffer, size, type, normalized, stride, offset) {
            return (gl) => {
                gl.enableVertexAttribArray(index);
                gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
                gl.vertexAttribPointer(index, size, type, normalized, stride, offset);
            };
        }
    }

    class CmdDrawElements extends RenderCommand {
        /**
         * @param {string} bufferName
         * @param {drawMode} mode
         * @param {Object} properties
         * @property {number} count
         * @property {number} [offset=0]
         */
        constructor(bufferName, mode, {count, offset=0, ...rest}={}) {
            super(rest);

            this.bufferName = bufferName;
            this.mode = mode;
            this.count = count;
            this.offset = offset;
        }

        prepare(renderObject) {
            const {buffer, byteSize, type} = renderObject.elementBuffers.get(this.bufferName);
            const byteOffset = this.offset * byteSize;
            const mode = drawMode.toGLMode(renderObject.gl, this.mode);

            return [CmdDrawElements._cmd(buffer, mode, this.count, type, byteOffset)];
        }

        static _cmd(buffer, mode, count, type, offset) {
            return (gl) => {
                gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer);
                gl.drawElements(mode, count, type, offset);
            };
        }
    }

    /**
     * Manipulable object in a scene
     */
    class SceneObject {
        /**
         * @param {RenderCommand[]} renderCommands
         * @param {(Object.<string, Object>|Iterable.<string, Object>)} attribData
         * @param {(Object.<string, Object>|Iterable.<string, Object>)} elementIndices
         * @param {Object} properties
         * @property {number} [inclusionFlags]
         * @property {Mat4} [matrix]
         */
        constructor(
            renderCommands = [], attribData = {}, elementIndices = {},
            {inclusionFlags = ~0, matrix = new Mat4()} = {}
        ) {
            this.renderCommands = Array.from(renderCommands);
            this.attribBuffers = new Map();
            this.elementBuffers = new Map();
            this.inclusionFlags = inclusionFlags;
            this.matrix = matrix;

            SceneObject._initializeAttribBuffers(
                this.attribBuffers,
                attribData[Symbol.iterator] === undefined ?
                    Object.entries(attribData) : attribData
            );

            SceneObject._initializeElementBuffers(
                this.elementBuffers,
                elementIndices[Symbol.iterator] === undefined ?
                    Object.entries(elementIndices) : elementIndices
            );
        }

        /**
         * Allocate appropriate typed arrays for attrib buffers
         *
         * @private
         *
         * @param {Map<string, Object>} attribBuffers
         * @param {Iterable.<string, Object>} attribData
         */
        static _initializeAttribBuffers(attribBuffers, attribData) {
            for (const [key, {data, usage = bufferUsage.STATIC_DRAW}] of attribData) {

                const entry = {
                    data: null,
                    usage,
                };
                attribBuffers.set(key, entry);

                const [max, min, isInt] = data.reduce(([max, min, isInt], value) => {
                    return [
                        Math.max(max, value),
                        Math.min(min, value),
                        isInt && Math.trunc(value) === value,
                    ];
                }, [-Infinity, Infinity, true]);

                if (isInt && min >= 0 && max <= 255) {
                    entry.data = new Uint8Array(data);
                    continue;
                }

                if (isInt && min >= -128 && max <= 127) {
                    entry.data = new Int8Array(data);
                    continue;
                }

                if (isInt && min >= 0 && max <= 65535) {
                    entry.data = new Uint16Array(data);
                    continue;
                }

                if (isInt && min >= -32768 && max <= 32767) {
                    entry.data = new Int16Array(data);
                    continue;
                }

                entry.data = new Float32Array(data);
            }
        }

        /**
         * Allocate appropriate typed arrays for element buffers
         *
         * @private
         *
         * @param {Map<string, Object>} elementBuffers
         * @param {Iterable.<string, Object>} elementIndices
         */
        static _initializeElementBuffers(elementBuffers, elementIndices) {
            for (const [key, {indices, inclusionFlags = ~0, usage = bufferUsage.STATIC_DRAW}] of elementIndices) {

                const max = indices.reduce((max, index) => Math.max(max, index));
                const indexArray = (max <= 255) ? Uint8Array : Uint16Array;

                elementBuffers.set(key, {
                    indices: new indexArray(indices),
                    inclusionFlags,
                    usage,
                });
            }
        }
    }

    /**
     * Renderable instance of a scene object home to a particular WebGL context
     */
    class RenderObject {
        /**
         * @param {WebGLRenderingContext} gl
         * @param {SceneObject} sceneObject
         * @param {Object} properties
         * @property {string} vertexShaderUrl
         * @property {string} fragmentShaderUrl
         */
        constructor(gl, sceneObject, {
            inclusionFlags,
            vertexShaderUrl = 'shaders/vertex.vert',
            fragmentShaderUrl = 'shaders/fragment.frag',
        }) {
            this.gl = gl;
            this.sceneObject = sceneObject;
            this.program = compileAndLinkProgram(this.gl, vertexShaderUrl, fragmentShaderUrl);
            this.renderCommands = [];

            this._determineUniforms();
            this._determineAttribs();

            const relevantCommands = this.sceneObject.renderCommands
                .filter(command => command.inclusionFlags & inclusionFlags);

            const usedAttribBuffers = this._determineUsedAttribBuffers(relevantCommands);
            const usedElementBuffers = RenderObject._determineUsedElementBuffers(relevantCommands);

            this._allocateAttribBuffers(usedAttribBuffers, this.sceneObject.attribBuffers);
            this._allocateElementBuffers(usedElementBuffers, this.sceneObject.elementBuffers);

            for (const command of relevantCommands) {
                this.renderCommands.push(...command.prepare(this));
            }
        }

        /**
         * Determine shader program uniforms and map their name to their metadata
         *
         * @private
         */
        _determineUniforms() {
            const numUniforms = this.gl.getProgramParameter(this.program, this.gl.ACTIVE_UNIFORMS);

            this.uniforms = new Map();
            for (let index = 0; index < numUniforms; ++index) {
                const {name, type, size} = this.gl.getActiveUniform(this.program, index);
                const location = this.gl.getUniformLocation(this.program, name);

                this.uniforms.set(name, {
                    location,
                    type,
                    size,
                });
            }
        }

        /**
         * Determine shader program attribs and map their name to their metadata
         *
         * @private
         */
        _determineAttribs() {
            const numAttribs = this.gl.getProgramParameter(this.program, this.gl.ACTIVE_ATTRIBUTES);

            this.attribs = new Map();
            for (let index = 0; index < numAttribs; index++) {
                const {name, type, size} = this.gl.getActiveAttrib(this.program, index);

                // TODO: remove debugging code
                const location = this.gl.getAttribLocation(this.program, name);
                if (location != index) {
                    console.error(`Disagreeing Attrib Location: ${index} -> ${name} -> ${location}`);
                    throw(Error(`Disagreeing Attrib Location: ${index} -> ${name} -> ${location}`));
                }

                this.attribs.set(name, {
                    index,
                    type,
                    size,
                });
            }
        }

        /**
         * Determine attrib buffers used by the relevant render commands
         *
         * @private
         *
         * @param {RenderCommand[]} commands
         *
         * @returns {Set<string>}
         */
        _determineUsedAttribBuffers(commands) {
            const usedBuffers = new Set();

            for (const command of commands) {
                if (!(command instanceof CmdSetAttrib)) {
                    continue;
                }

                if (!this.attribs.has(command.attribName)) {
                    continue;
                }

                usedBuffers.add(command.bufferName);
            }

            return usedBuffers;
        }

        /**
         * Determine element buffers used by the relevant render commands
         *
         * @private
         *
         * @param {RenderCommand[]} commands
         *
         * @returns {Set<string>}
         */
        static _determineUsedElementBuffers(commands) {
            const usedBuffers = new Set();

            for (const command of commands) {
                if (!(command instanceof CmdDrawElements)) {
                    continue;
                }

                usedBuffers.add(command.bufferName);
            }

            return usedBuffers;
        }

        /**
         * Allocate and fill attribute buffers
         *
         * @private
         *
         * @param {Set<string>} keys
         * @param {Map<string, Object>}attribBuffers
         */
        _allocateAttribBuffers(keys, attribBuffers) {
            this.attribBuffers = new Map();

            for (const key of keys) {
                const {data, usage} = attribBuffers.get(key);
                const buffer = this.gl.createBuffer();
                this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
                this.gl.bufferData(this.gl.ARRAY_BUFFER, data, bufferUsage.toGLUsage(this.gl, usage));

                const {byteSize, type} = this._getBufferSpecs(data);
                this.attribBuffers.set(key, {
                    buffer,
                    byteSize,
                    type,
                });
            }

            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null);
        }

        /**
         * Allocate and fill element buffers
         *
         * @private
         *
         * @param {Set<string>} keys
         * @param {Map<string, Object>} elementBuffers
         */
        _allocateElementBuffers(keys, elementBuffers) {
            this.elementBuffers = new Map();

            for (const key of keys) {
                const {indices, usage} = elementBuffers.get(key);
                const buffer = this.gl.createBuffer();
                this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, buffer);
                this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, indices, bufferUsage.toGLUsage(this.gl, usage));

                const {byteSize, type} = this._getBufferSpecs(indices);
                this.elementBuffers.set(key, {
                    buffer,
                    byteSize,
                    type,
                });
            }

            this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, null);
        }

        /**
         * Determine specifications of a typed array
         * when used as a buffer in a WebGL context.
         *
         * @private
         *
         * @param {ArrayBuffer} bufferArray
         *
         * @returns {Object}
         * @property {number} byteSize
         * @property {GLenum} type
         */
        _getBufferSpecs(bufferArray) {
            if (bufferArray instanceof Uint8Array) {
                return {byteSize: 1, type: this.gl.UNSIGNED_BYTE};
            }
            if (bufferArray instanceof Uint16Array) {
                return {byteSize: 2, type: this.gl.UNSIGNED_SHORT};
            }
            if (bufferArray instanceof Float32Array) {
                return {byteSize: 4, type: this.gl.FLOAT};
            }
            if (bufferArray instanceof Int8Array) {
                return {byteSize: 1, type: this.gl.BYTE};
            }
            if (bufferArray instanceof Int16Array) {
                return {byteSize: 2, type: this.gl.SHORT};
            }

            throw Error("unsupported buffer array type");
        }
    }

    /**
     * Context encapsulating a WebGL context, RenderObjects, some properties
     * and methods for rendering
     */
    class RenderContext {
        /**
         * @param {WebGLRenderingContext} gl
         * @param {SceneObject[]} scene
         * @param {Object} properties
         * @property {number[]} clearColor
         * @property {Mat4} view
         * @property {number} fieldOfView
         * @property {number} zNear
         * @property {number} zFar
         * @property {number} inclusionFlags
         */
        constructor(gl, scene, {
            clearColor = [0.0, 0.0, 0.0, 0.0],
            view = new Mat4(),
            fieldOfView = 90.0,
            zNear = 1.0,
            zFar = Infinity,
            inclusionFlags = ~0,
            ...objectProperties
        }) {
            this.gl = gl;

            this.clearColor = clearColor;
            this.view = view;

            this.fiddleCanvas(true);

            this.fieldOfView = fieldOfView;
            this.zNear = zNear;
            this.zFar = zFar;

            this.calculatePerspective();

            this.renderObjects = [];
            for (const sceneObject of scene) {
                if (!(sceneObject.inclusionFlags & inclusionFlags)) {
                    continue;
                }

                const renderObject = new RenderObject(this.gl, sceneObject, Object.assign({inclusionFlags}, objectProperties));
                this.renderObjects.push(renderObject);
            }
        }

        /**
         * Ensure the backing buffer of the canvas has the right size
         *
         * @param {boolean} [force]
         *
         * @returns {boolean}
         */
        fiddleCanvas(force) {
            const canvas = this.gl.canvas;

            const width = Math.ceil(canvas.scrollWidth);
            // noinspection JSSuspiciousNameCombination
            const height = Math.ceil(canvas.scrollHeight);

            if (!force && width === canvas.width && height === canvas.height) {
                return false;
            }

            canvas.width = width;
            canvas.height = height;

            this.aspectX = (width > height) ? height / width : 1.0;
            this.aspectY = (width < height) ? width / height : 1.0;

            return true;
        }

        /**
         * Calculate perspective matrix taking current aspect ratio into account
         */
        calculatePerspective() {
            const range = Math.tan(Math.PI * 0.5 * (1.0 - this.fieldOfView / 180.0));
            const viewRangeX = range * this.aspectX;
            const viewRangeY = range * this.aspectY;

            const zNear = this.zNear;
            const zFar = this.zFar;

            const perspectiveZ = (zFar < Infinity) ? (zNear + zFar) / (zFar - zNear) : 1.0;
            const perspectiveW = (zFar < Infinity) ? -2.0 * zNear * zFar / (zFar - zNear) : -2.0 * zNear;

            this.projection = new Mat4([
                viewRangeX, 0.0, 0.0, 0.0,
                0.0, viewRangeY, 0.0, 0.0,
                0.0, 0.0, perspectiveZ, 1.0,
                0.0, 0.0, perspectiveW, 0.0,
            ]);
        }

        /**
         * Render objects with current settings
         */
        render() {
            const gl = this.gl;

            if (this.fiddleCanvas()) {
                this.calculatePerspective();
            }

            console.assert(gl.drawingBufferWidth === gl.canvas.width);
            console.assert(gl.drawingBufferHeight === gl.canvas.height);

            gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
            gl.clearColor(...this.clearColor);
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
            gl.enable(gl.CULL_FACE);
            gl.enable(gl.DEPTH_TEST);

            for (const obj of this.renderObjects) {
                const sceneObj = obj.sceneObject;

                gl.useProgram(obj.program);

                const uniforms = obj.uniforms;

                if (uniforms.has('u_model_matrix')) {
                    gl.uniformMatrix4fv(uniforms.get('u_model_matrix').location, false, sceneObj.matrix.data);
                }
                if (uniforms.has('u_view_matrix')) {
                    gl.uniformMatrix4fv(uniforms.get('u_view_matrix').location, false, this.view.data);
                }
                if (uniforms.has('u_projection_matrix')) {
                    gl.uniformMatrix4fv(uniforms.get('u_projection_matrix').location, false, this.projection.data);
                }

                for (const renderFunction of obj.renderCommands) {
                    renderFunction(gl);
                }
            }
        }
    }

    /**
     * Semantic flags to determine what to render in which context
     *
     * @enum {number}
     * @readonly
     */
    const renderInclusion = {
        NORMAL: 1 << 0,
        EYE_DEMO: 1 << 1,
        STEREOGRAM: 1 << 2,
    };

    /**
     * Build the 3D scene
     *
     * @returns {SceneObject[]}
     */
    function buildScene() {

        return [
            new SceneObject(
                [
                    new CmdSetAttrib('a_position', 'main', {size: 3, normalized: false, stride: 6, offset: 0}),
                    new CmdSetAttrib('a_color', 'main', {size: 3, normalized: false, stride: 6, offset: 3}),
                    new CmdDrawElements('main', drawMode.TRIANGLES, {count: 36, offset: 0}),
                ],
                {
                    main: {
                        data: [
                            -0.5, -0.5, -0.5,   1.0, 0.0, 0.0,
                             0.5, -0.5, -0.5,   1.0, 0.0, 0.0,
                            -0.5,  0.5, -0.5,   1.0, 0.0, 0.0,
                             0.5,  0.5, -0.5,   1.0, 0.0, 0.0,

                             0.5, -0.5, -0.5,   1.0, 0.0, 1.0,
                             0.5, -0.5,  0.5,   1.0, 0.0, 1.0,
                             0.5,  0.5, -0.5,   1.0, 0.0, 1.0,
                             0.5,  0.5,  0.5,   1.0, 0.0, 1.0,

                            -0.5,  0.5, -0.5,   0.0, 1.0, 0.0,
                             0.5,  0.5, -0.5,   0.0, 1.0, 0.0,
                            -0.5,  0.5,  0.5,   0.0, 1.0, 0.0,
                             0.5,  0.5,  0.5,   0.0, 1.0, 0.0,

                            -0.5, -0.5, -0.5,   0.0, 1.0, 1.0,
                            -0.5,  0.5, -0.5,   0.0, 1.0, 1.0,
                            -0.5, -0.5,  0.5,   0.0, 1.0, 1.0,
                            -0.5,  0.5,  0.5,   0.0, 1.0, 1.0,

                            -0.5, -0.5, -0.5,   1.0, 1.0, 0.0,
                            -0.5, -0.5,  0.5,   1.0, 1.0, 0.0,
                             0.5, -0.5, -0.5,   1.0, 1.0, 0.0,
                             0.5, -0.5,  0.5,   1.0, 1.0, 0.0,

                            -0.5, -0.5,  0.5,   1.0, 1.0, 1.0,
                            -0.5,  0.5,  0.5,   1.0, 1.0, 1.0,
                             0.5, -0.5,  0.5,   1.0, 1.0, 1.0,
                             0.5,  0.5,  0.5,   1.0, 1.0, 1.0,
                        ],
                    },
                },
                {
                    main: {
                        indices: [
                            0,  1,  2,    3,  2,  1,
                            4,  5,  6,    7,  6,  5,
                            8,  9, 10,   11, 10,  9,
                            12, 13, 14,   15, 14, 13,
                            16, 17, 18,   19, 18, 17,
                            20, 21, 22,   23, 22, 21,
                        ],
                    },
                }
            ),
        ];
    }

    /**
     * Build render contexts
     *
     * @param {SceneObject[]} scene
     * @param {Object.<string, Object>} contextPropertiesMap
     *
     * @returns {RenderContext[]}
     */
    function buildContexts(scene, contextPropertiesMap) {
        /** @type {RenderContext[]} */
        const renderContexts = [];

        for (const [id, properties] of Object.entries(contextPropertiesMap)) {
            const canvas = /** @type {HTMLCanvasElement} */ document.getElementById(id);

            /** @type {WebGLRenderingContext} */
            const gl = canvas.getContext('webgl');
            if (!gl) {
                continue;
            }

            renderContexts.push(new RenderContext(gl, scene, properties));
        }

        return renderContexts;
    }

    /**
     * Set up recurring rendering
     *
     * @param {SceneObject[]} scene
     * @param {RenderContext[]} contexts
     */
    function startAnimationLoop(scene, contexts) {
        let then;

        /**
         * @callback FrameRequestCallback
         * @param {DOMHighResTimeStamp} now
         */
        const renderAnimationCallback = (now) => {
            const delta = (now - (then || now)) / 1000.0;
            const rot = Mat4.mul(
                Mat4.rotationX(now * 0.006),
                Mat4.rotationY(now * 0.007)
            );

            for (const obj of scene) {
                obj.matrix = rot;
            }

            for (const ctx of contexts) {
                ctx.render();
            }

            then = now;
            requestAnimationFrame(renderAnimationCallback);
        };

        requestAnimationFrame(renderAnimationCallback);
    }

    /* TODO: combine named function above into this anonymous one */
    (() => {
        /** @type {SceneObject[]} */
        const scene = buildScene();

        /** @type {RenderContext[]} */
        const contexts = buildContexts(scene, {
            'render': {
                view: Mat4.translation(0.0, 0.0, 2.0),
                fragmentShaderUrl: 'shaders/fragment.frag',
                inclusionFlags: renderInclusion.NORMAL,
                zNear: 1.0,
                zFar: 3.0,
            },
            'left_eye': {
                view: Mat4.translation(0.25, 0.0, 2.0),
                fragmentShaderUrl: 'shaders/depthmap.frag',
                clearColor: [1.0, 1.0, 1.0, 1.0,],
                inclusionFlags: renderInclusion.EYE_DEMO,
                zNear: 1.0,
                zFar: 3.0,
            },
            'right_eye': {
                view: Mat4.translation(-0.25, 0.0, 2.0),
                fragmentShaderUrl: 'shaders/depthmap.frag',
                clearColor: [1.0, 1.0, 1.0, 1.0,],
                inclusionFlags: renderInclusion.EYE_DEMO,
                zNear: 1.0,
                zFar: 3.0,
            },
        });

        startAnimationLoop(scene, contexts);
    })();
});
