'use strict';

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
export class Mat4 extends Float32Array {
    /**
     * @param {(Mat4|number[]|number)} [data=16]
     */
    constructor(data=16) {
        if (data instanceof Mat4 || data === 16) {
            super(data);
            return;
        }

        if (!(data instanceof Float32Array) && !(data instanceof Float64Array) && !Array.isArray(data)) {
            throw new TypeError("expected array of floats");
        }

        if (data.length !== 16) {
            throw new RangeError("expected length 16");
        }

        super(data);
    }

    /**
     * Create a new identity matrix
     *
     * @returns {Mat4}
     */
    static identity() {
        return new Mat4(Mat4._IDENTITY);
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
        return new Mat4([
            this[0], this[4], this[ 8], this[12],
            this[1], this[5], this[ 9], this[13],
            this[2], this[6], this[10], this[14],
            this[3], this[7], this[11], this[15],
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
        ] = a;

        const [
            b00, b10, b20, b30,
            b01, b11, b21, b31,
            b02, b12, b22, b32,
            b03, b13, b23, b33,
        ] = b;

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

Mat4._IDENTITY = new Mat4([
    1.0, 0.0, 0.0, 0.0,
    0.0, 1.0, 0.0, 0.0,
    0.0, 0.0, 1.0, 0.0,
    0.0, 0.0, 0.0, 1.0,
]);
