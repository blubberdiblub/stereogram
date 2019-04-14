'use strict';

import {_RenderCommand} from "../RenderCommand.mjs";
import {drawMode} from "../../enums/drawMode.mjs";

/**
 * Draw indexed elements
 */
export class CmdDrawElements extends _RenderCommand {
    /**
     * @param {string} bufferName
     * @param {drawMode} mode
     * @param {Object} [properties={}]
     * @param {number} [properties.count=Infinity]
     * @param {number} [properties.offset=0]
     */
    constructor(bufferName, mode, {count=Infinity, offset=0, ...rest}={}) {
        super(rest);

        this.bufferName = bufferName;
        this.mode = mode;
        this.count = (count === undefined || count === null) ? Infinity : count;
        this.offset = offset || 0;

        if (this.count < 0) {
            throw RangeError("count must not be negative");
        }

        if (this.offset < 0) {
            throw RangeError("offset must not be negative");
        }

        if (!this.count) {
            this.inclusionFlags = 0;
        }
    }

    prepare(renderObject, renderStage) {
        const elementBuffer = renderObject.elementBuffers.get(this.bufferName);
        if (elementBuffer === undefined) {
            throw ReferenceError(`missing element buffer ${this.bufferName}`);
        }

        const {buffer, byteSize, type, length} = elementBuffer;

        if (this.offset > length) {
            throw RangeError("offset beyond end of buffer");
        }

        let count = this.count;
        if (count === Infinity) {
            count = length - this.offset;
        } else if (count > length - this.offset) {
            throw RangeError("count goes beyond end of buffer");
        }

        if (!count) {
            return [];
        }

        const byteOffset = this.offset * byteSize;
        const mode = drawMode.toGLMode(renderStage.gl, this.mode);

        return [CmdDrawElements._cmd(buffer, mode, count, type, byteOffset)];
    }

    static _cmd(buffer, mode, count, type, offset) {
        return (gl) => {
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer);
            gl.drawElements(mode, count, type, offset);
        };
    }
}
