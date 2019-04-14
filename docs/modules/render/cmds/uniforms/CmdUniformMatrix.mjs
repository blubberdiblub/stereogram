'use strict';

import {_CmdUniform} from "./CmdUniform.mjs";
import {uniformSource} from "../../enums/uniformSource.mjs";
import {Mat4} from "../../../Mat4.mjs";

/**
 * Write to a matrix uniform
 */
export class CmdUniformMatrix extends _CmdUniform {
    /**
     * @param {string} uniformName
     * @param {string} propertyName
     * @param {Object} properties
     * @property {boolean} [transpose=false]
     */
    constructor(uniformName, propertyName, {transpose=false, ...rest}={}) {
        super(uniformName, rest);

        this.propertyName = propertyName;
        this.transpose = transpose;
    }

    prepare(renderObject, renderStage) {
        const reader = uniformSource.getPropertyReader(this.source, this.propertyName, renderObject, renderStage);

        const uniform = renderObject.uniforms.get(this.uniformName);
        if (uniform === undefined) {
            return [];
        }

        const {location, type} = uniform;
        const gl = renderStage.gl;
        const value = reader();

        switch (type) {
            case gl.FLOAT_MAT4:
                if (value instanceof Mat4) {
                    return [CmdUniformMatrix._cmdMat4(location, this.transpose, reader)];
                }

                if (value instanceof Float32Array && value.length === 16) {
                    return [CmdUniformMatrix._cmdF32A16(location, this.transpose, reader)];
                }

                throw TypeError("property is not a 4x4 matrix");

            case gl.FLOAT_MAT3:
                if (value instanceof Float32Array && value.length === 9) {
                    return [CmdUniformMatrix._cmdF32A9(location, this.transpose, reader)];
                }

                throw TypeError("property is not a 3x3 matrix");

            case gl.FLOAT_MAT2:
                if (value instanceof Float32Array && value.length === 4) {
                    return [CmdUniformMatrix._cmdF32A4(location, this.transpose, reader)];
                }

                throw TypeError("property is not a 2x2 matrix");

            default:
                throw TypeError("uniform is not a supported matrix");
        }
    }

    static _cmdMat4(location, transpose, reader) {
        return (gl) => {
            gl.uniformMatrix4fv(location, transpose, reader());
        };
    }

    static _cmdF32A16(location, transpose, reader) {
        return (gl) => {
            gl.uniformMatrix4fv(location, transpose, reader());
        };
    }

    static _cmdF32A9(location, transpose, reader) {
        return (gl) => {
            gl.uniformMatrix3fv(location, transpose, reader());
        };
    }

    static _cmdF32A4(location, transpose, reader) {
        return (gl) => {
            gl.uniformMatrix2fv(location, transpose, reader());
        };
    }
}
