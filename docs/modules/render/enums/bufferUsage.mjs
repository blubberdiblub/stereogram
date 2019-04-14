'use strict';

/**
 * Buffer usage modes to help WebGL make optimization decisions
 *
 * They are made available independent from a WebGL context
 * so they can be used with more abstract scene objects.
 *
 * @enum {number}
 * @readonly
 */
export const bufferUsage = {
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
