window.addEventListener('load', () => {
    'use strict';

    /**
     * Load shader source code from a web site resource
     * @param {string} url
     * @param {string} mime
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
     * @param {WebGLRenderingContext} gl
     * @param {GLenum} type
     * @param {string} source
     * @returns {?WebGLShader}
     */
    function createShader(gl, type, source) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
        if (success) {
            return shader;
        }

        console.error(gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);

        return null;
    }

    /**
     * Create a vertex shader from a URL
     * @param {WebGLRenderingContext} gl
     * @param {string} url
     * @returns {?WebGLShader}
     */
    function createVertexShader(gl, url) {
        let source;

        const normalizedURL = new URL(url, window.location.href);
        if (Object.prototype.hasOwnProperty.call(createVertexShader._cache, normalizedURL)) {
            source = createVertexShader._cache[normalizedURL];
        } else {
            source = loadShader(url, 'x-shader/x-vertex');
            createVertexShader._cache[normalizedURL] = source;
        }

        return createShader(gl, gl.VERTEX_SHADER, source);
    }

    createVertexShader._cache = {};

    /**
     * Create a fragment shader from a URL
     * @param {WebGLRenderingContext} gl
     * @param {string} url
     * @returns {?WebGLShader}
     */
    function createFragmentShader(gl, url) {
        let source;

        const normalizedURL = new URL(url, window.location.href);
        if (Object.prototype.hasOwnProperty.call(createFragmentShader._cache, normalizedURL)) {
            source = createFragmentShader._cache[normalizedURL];
        } else {
            source = loadShader(url, 'x-shader/x-fragment');
            createFragmentShader._cache[normalizedURL] = source;
        }

        return createShader(gl, gl.FRAGMENT_SHADER, source);
    }

    createFragmentShader._cache = {};

    /**
     * Create a shader program from compiled vertex and fragment shaders
     * @param {WebGLRenderingContext} gl
     * @param {WebGLShader} vertexShader
     * @param {WebGLShader} fragmentShader
     * @returns {?WebGLProgram}
     */
    function createProgram(gl, vertexShader, fragmentShader) {
        const program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);

        const success = gl.getProgramParameter(program, gl.LINK_STATUS);
        if (success) {
            return program;
        }

        console.error(gl.getProgramInfoLog(program));
        gl.deleteProgram(program);

        return null;
    }

    /**
     * Create a shader program from vertex and fragment shader URLs
     * @param {WebGLRenderingContext} gl
     * @param {string} vertexShaderUrl
     * @param {string} fragmentShaderUrl
     * @returns {?WebGLProgram}
     */
    function compileAndLinkProgram(gl, vertexShaderUrl, fragmentShaderUrl) {
        const vertexShader = createVertexShader(gl, vertexShaderUrl);
        if (vertexShader === null) {
            return null;
        }

        const fragmentShader = createFragmentShader(gl, fragmentShaderUrl);
        if (fragmentShader === null) {
            gl.deleteShader(vertexShader);
            return null;
        }

        const program = createProgram(gl, vertexShader, fragmentShader);
        if (program === null) {
            gl.deleteShader(fragmentShader);
            gl.deleteShader(vertexShader);
            return null;
        }

        return program;
    }

    class Mat4 {
        /**
         * Construct a 4x4 matrix
         * @param {Mat4|number[]} [data]
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
         * @param {number} factor
         * @returns {Mat4}
         */
        static scaling(factor) {
            return new Mat4([
                factor, 0.0, 0.0, 0.0,
                0.0, factor, 0.0, 0.0,
                0.0, 0.0, factor, 0.0,
                0.0, 0.0, 0.0, 1.0,
            ]);
        }

        /**
         * Create a new translation matrix
         * @param {number} x
         * @param {number} y
         * @param {number} z
         * @returns {Mat4}
         */
        static translation(x, y, z) {
            return new Mat4([
                1.0, 0.0, 0.0, 0.0,
                0.0, 1.0, 0.0, 0.0,
                0.0, 0.0, 1.0, 0.0,
                x, y, z, 1.0,
            ]);
        }

        /**
         * Create a new rotation matrix around the X axis
         * @param {number} angle
         * @returns {Mat4}
         */
        static rotationX(angle) {
            const rad = angle * Math.PI / 180.0;
            const c = Math.cos(rad);
            const s = Math.sin(rad);

            return new Mat4([
                1.0, 0.0, 0.0, 0.0,
                0.0, c, -s, 0.0,
                0.0, s, c, 0.0,
                0.0, 0.0, 0.0, 1.0,
            ]);
        }

        /**
         * Create a new rotation matrix around the Y axis
         * @param {number} angle
         * @returns {Mat4}
         */
        static rotationY(angle) {
            const rad = angle * Math.PI / 180.0;
            const c = Math.cos(rad);
            const s = Math.sin(rad);

            return new Mat4([
                c, 0.0, s, 0.0,
                0.0, 1.0, 0.0, 0.0,
                -s, 0.0, c, 0.0,
                0.0, 0.0, 0.0, 1.0,
            ]);
        }

        /**
         * Create a new rotation matrix around the Z axis
         * @param {number} angle
         * @returns {Mat4}
         */
        static rotationZ(angle) {
            const rad = angle * Math.PI / 180.0;
            const c = Math.cos(rad);
            const s = Math.sin(rad);

            return new Mat4([
                c, -s, 0.0, 0.0,
                s, c, 0.0, 0.0,
                0.0, 0.0, 1.0, 0.0,
                0.0, 0.0, 0.0, 1.0,
            ]);
        }

        /**
         * Return the transposition of this matrix
         * @returns {Mat4}
         */
        transposition() {
            const data = this.data;

            return new Mat4([
                data[0], data[4], data[8], data[12],
                data[1], data[5], data[9], data[13],
                data[2], data[6], data[10], data[14],
                data[3], data[7], data[11], data[15],
            ]);
        }

        /**
         * Return the result of matrix multiplication
         * applied to this and a second matrix
         * @param {Mat4} m1
         * @param {Mat4} m2
         * @returns {Mat4}
         */
        static mul(m1, m2) {
            const a = m1.data;
            const b = m2.data;

            const
                a00 = a[ 0], a10 = a[ 1], a20 = a[ 2], a30 = a[ 3],
                a01 = a[ 4], a11 = a[ 5], a21 = a[ 6], a31 = a[ 7],
                a02 = a[ 8], a12 = a[ 9], a22 = a[10], a32 = a[11],
                a03 = a[12], a13 = a[13], a23 = a[14], a33 = a[15];

            const
                b00 = b[ 0], b10 = b[ 1], b20 = b[ 2], b30 = b[ 3],
                b01 = b[ 4], b11 = b[ 5], b21 = b[ 6], b31 = b[ 7],
                b02 = b[ 8], b12 = b[ 9], b22 = b[10], b32 = b[11],
                b03 = b[12], b13 = b[13], b23 = b[14], b33 = b[15];

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

    class SceneObject {
        /**
         * Construct a SceneObject
         * @param {number[]} attribs
         * @param {number[]} indices
         * @param {Mat4} [matrix]
         */
        constructor(attribs, indices, matrix) {
            this.attribs = new Float32Array(attribs);

            const maxIndex = indices.reduce((runningMax, idx) => Math.max(runningMax, idx));
            const indexArray = (maxIndex <= 255) ? Uint8Array : Uint16Array;
            this.indices = new indexArray(indices);

            this.matrix = matrix || new Mat4();
        }
    }

    class RenderObject {
        /**
         * Construct a RenderObject
         * @param {WebGLRenderingContext} gl
         * @param {SceneObject} sceneObject
         */
        constructor(gl, sceneObject) {
            this.program = compileAndLinkProgram(gl,
                'shaders/vertex.vert',
                'shaders/fragment.frag'
            );

            this.uniformLocations = {
                matrix: gl.getUniformLocation(this.program, 'u_matrix'),
                projection: gl.getUniformLocation(this.program, 'u_projection'),
            };

            this.attribLocations = {
                position: gl.getAttribLocation(this.program, 'a_position'),
                color: gl.getAttribLocation(this.program, 'a_color'),
            };

            this.attribBuffer = gl.createBuffer();
            this.indexBuffer = gl.createBuffer();

            gl.bindBuffer(gl.ARRAY_BUFFER, this.attribBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, sceneObject.attribs, gl.STATIC_DRAW);

            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, sceneObject.indices, gl.STATIC_DRAW);

            this.indexType = sceneObject.indices instanceof Uint8Array ? gl.UNSIGNED_BYTE : gl.UNSIGNED_SHORT;

            this.sceneObject = sceneObject;
        }
    }

    /**
     * Ensure the backing buffer of the canvas has the right size
     * @param {HTMLCanvasElement} canvas
     * @returns {boolean}
     */
    function resizeCanvas(canvas) {
        const width = Math.ceil(canvas.scrollWidth);
        // noinspection JSSuspiciousNameCombination
        const height = Math.ceil(canvas.scrollHeight);

        if (width === canvas.width && height === canvas.height) {
            return false;
        }

        canvas.width = width;
        canvas.height = height;
        return true;
    }

    class RenderContext {
        /**
         * Construct a RenderContext
         * @param {WebGLRenderingContext} gl
         * @param {SceneObject[]} scene
         */
        constructor(gl, scene) {
            this.gl = gl;

            // this.projection = new Mat4();
            resizeCanvas(gl.canvas);
            this.calculatePerspective();

            this.renderObjects = [];
            for (const sceneObject of scene) {
                const renderObject = new RenderObject(this.gl, sceneObject);
                this.renderObjects.push(renderObject);
            }
        }

        /**
         * Calculate perspective matrix taking current aspect ratio into account
         */
        calculatePerspective() {
            const fov = 90.0;
            const range = Math.tan(Math.PI * 0.5 * (1.0 - fov / 180.0));

            const {scrollWidth: w, scrollHeight: h} = this.gl.canvas;
            const aspectX = (w > h) ? range * h / w : range;
            const aspectY = (w < h) ? range * w / h : range;

            const zNear = 1.0;
            const zFar = Infinity;

            let perspZ = 1.0;
            let perspW = -2.0 * zNear;

            if (zFar < Infinity) {
                perspZ = (zNear + zFar) / (zFar - zNear);
                perspW = -2.0 * zNear * zFar / (zFar - zNear);
            }

            this.projection = new Mat4([
                aspectX, 0.0, 0.0, 0.0,
                0.0, aspectY, 0.0, 0.0,
                0.0, 0.0, perspZ, 1.0,
                0.0, 0.0, perspW, 0.0,
            ]);
        }

        /**
         * Render context
         */
        render() {
            const gl = this.gl;

            const canvasChanged = resizeCanvas(gl.canvas);
            if (canvasChanged) {
                this.calculatePerspective();
            }

            console.assert(gl.drawingBufferWidth === gl.canvas.width);
            console.assert(gl.drawingBufferHeight === gl.canvas.height);

            gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
            gl.enable(gl.CULL_FACE);
            gl.enable(gl.DEPTH_TEST);

            for (const obj of this.renderObjects) {
                const sceneObj = obj.sceneObject;

                gl.useProgram(obj.program);

                gl.enableVertexAttribArray(obj.attribLocations.position);
                gl.bindBuffer(gl.ARRAY_BUFFER, obj.attribBuffer);
                gl.vertexAttribPointer(obj.attribLocations.position, 3, gl.FLOAT, false, 6*4, 0);

                gl.enableVertexAttribArray(obj.attribLocations.color);
                gl.bindBuffer(gl.ARRAY_BUFFER, obj.attribBuffer);
                gl.vertexAttribPointer(obj.attribLocations.color, 3, gl.FLOAT, false, 6*4, 3*4);

                const uniformLocations = obj.uniformLocations;
                gl.uniformMatrix4fv(uniformLocations.matrix, false, sceneObj.matrix.data);
                if (uniformLocations.projection) {
                    gl.uniformMatrix4fv(uniformLocations.projection, false, this.projection.data);
                }

                gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, obj.indexBuffer);
                gl.drawElements(gl.TRIANGLES, sceneObj.indices.length, obj.indexType, 0);
            }
        }
    }

    /**
     * Build the 3D scene
     * @returns {SceneObject[]}
     */
    function buildScene() {

        return [
            new SceneObject([
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
            ], [
                 0,  1,  2,    3,  2,  1,
                 4,  5,  6,    7,  6,  5,
                 8,  9, 10,   11, 10,  9,
                12, 13, 14,   15, 14, 13,
                16, 17, 18,   19, 18, 17,
                20, 21, 22,   23, 22, 21,
            ]),
        ];
    }

    /**
     * Build render contexts
     * @param {SceneObject[]} scene
     * @param {string[]} ids
     * @returns {RenderContext[]}
     */
    function buildContexts(scene, ids) {
        /** @type {RenderContext[]} */
        const renderContexts = [];

        for (const id of ids) {
            const canvas = /** @type {HTMLCanvasElement} */ document.getElementById(id);

            /** @type {WebGLRenderingContext} */
            const gl = canvas.getContext('webgl');
            if (!gl) {
                continue;
            }

            renderContexts.push(new RenderContext(gl, scene));
        }

        return renderContexts;
    }

    /**
     * Set up regular rendering
     * @param {SceneObject[]} scene
     * @param {RenderContext[]} contexts
     */
    function startAnimationLoop(scene, contexts) {
        let then;

        /**
         * @callback
         * @param {DOMHighResTimeStamp} now
         */
        const renderAnimationCallback = (now) => {
            const delta = (now - (then || now)) / 1000.0;
            const rot = Mat4.mul(
                Mat4.rotationX(now * 0.006),
                Mat4.rotationY(now * 0.007)
            );

            for (const obj of scene) {
                obj.matrix = Mat4.mul(Mat4.translation(0.0, 0.0, 2.0), rot);
            }

            for (const ctx of contexts) {
                ctx.render();
            }

            then = now;
            requestAnimationFrame(renderAnimationCallback);
        };

        requestAnimationFrame(renderAnimationCallback);
    }

    /** @type {SceneObject[]} */
    const scene = buildScene();

    /** @type {RenderContext[]} */
    const contexts = buildContexts(scene, ['render',]);

    startAnimationLoop(scene, contexts);
});
