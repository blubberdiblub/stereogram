'use strict';

/**
 * Draw modes which determine how indices or attributes are
 * structured into drawing primitives
 *
 * The are subsequently translated into their respective WebGL modes.
 *
 * @enum {number}
 * @readonly
 */
export const drawMode = {
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
