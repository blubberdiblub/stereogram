'use strict';

import {_RenderCommand} from "../RenderCommand.mjs";

/**
 * Set up an attribute
 */
export class CmdSetAttrib extends _RenderCommand {
    /**
     * @param {string} attribName
     * @param {string} bufferName
     * @param {Object} [properties={}]
     * @param {number} [properties.size]
     * @param {boolean} [properties.normalized=false]
     * @param {number} [properties.stride=0]
     * @param {number} [properties.offset=0]
     */
    constructor(attribName, bufferName, {size, normalized=false, stride=0, offset=0, ...rest}={}) {
        super(rest);

        this.attribName = attribName;
        this.bufferName = bufferName;
        this.size = size || 0;
        this.normalized = normalized;
        this.stride = stride || 0;
        this.offset = offset || 0;

        if (this.size && (this.size < 1 || this.size > 4)) {
            throw RangeError("size must be between 1 and 4 or null");
        }

        if (this.stride < 0) {
            throw RangeError("stride must not be negative");
        }

        if (this.offset < 0) {
            throw RangeError("offset must not be negative");
        }
    }

    prepare(renderObject, ignored) {
        const attrib = renderObject.attribs.get(this.attribName);
        if (attrib === undefined) {
            return [];
        }

        const attribBuffer = renderObject.attribBuffers.get(this.bufferName);
        if (attribBuffer === undefined) {
            throw ReferenceError(`missing attribute buffer ${this.bufferName}`);
        }

        const {buffer, byteSize, type, length} = attribBuffer;

        if (this.offset > length) {
            throw RangeError("offset beyond end of buffer");
        }

        const size = this.size || attrib.size;

        if (this.offset + size > length) {
            throw RangeError("no attribute fits before end of buffer");
        }

        const byteStride = this.stride * byteSize;

        if (byteStride > 255) {
            throw RangeError("stride is too big");
        }

        const byteOffset = this.offset * byteSize;

        return [CmdSetAttrib._cmd(attrib.location, buffer, size, type, this.normalized, byteStride, byteOffset)];
    }

    static _cmd(location, buffer, size, type, normalized, stride, offset) {
        return (gl) => {
            gl.enableVertexAttribArray(location);
            gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
            gl.vertexAttribPointer(location, size, type, normalized, stride, offset);
        };
    }
}
