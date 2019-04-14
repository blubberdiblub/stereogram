'use strict';

import {Mat4} from "../Mat4.mjs";
import {bufferUsage} from "./enums/bufferUsage.mjs";

/**
 * Manipulable object in a scene
 */
export class SceneObject {
    /**
     * @param {_RenderCommand[]} renderCommands
     * @param {(Object.<string, Object>|Iterable.<string, Object>)} attribData
     * @param {(Object.<string, Object>|Iterable.<string, Object>)} elementIndices
     * @param {Object} properties
     * @property {number} [inclusionFlags=~0]
     * @property {Mat4} [matrix=Mat4.identity()]
     */
    constructor(
        renderCommands = [], attribData = {}, elementIndices = {},
        {inclusionFlags = ~0, matrix = Mat4.identity()} = {}
    ) {
        /** @type {_RenderCommand[]} */
        this.renderCommands = Array.from(renderCommands);
        this.attribArrays = new Map();
        this.elementArrays = new Map();
        this.inclusionFlags = inclusionFlags;
        this.matrix = matrix;

        SceneObject._initializeAttribArrays(
            this.attribArrays,
            attribData[Symbol.iterator] === undefined ?
                Object.entries(attribData) : attribData
        );

        SceneObject._initializeElementArrays(
            this.elementArrays,
            elementIndices[Symbol.iterator] === undefined ?
                Object.entries(elementIndices) : elementIndices
        );
    }

    /**
     * Allocate appropriate typed arrays for attrib buffers
     *
     * @private
     *
     * @param {Map<string, Object>} attribArrays
     * @param {Iterable.<string, Object>} attribData
     */
    static _initializeAttribArrays(attribArrays, attribData) {
        for (const [key, {data, usage = bufferUsage.STATIC_DRAW}] of attribData) {

            const entry = {
                data: null,
                usage,
            };
            attribArrays.set(key, entry);

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
     * @param {Map<string, Object>} elementArrays
     * @param {Iterable.<string, Object>} elementIndices
     */
    static _initializeElementArrays(elementArrays, elementIndices) {
        for (const [key, {indices, inclusionFlags = ~0, usage = bufferUsage.STATIC_DRAW}] of elementIndices) {

            const max = indices.reduce((max, index) => Math.max(max, index));
            const indexArray = (max <= 255) ? Uint8Array : Uint16Array;

            elementArrays.set(key, {
                indices: new indexArray(indices),
                inclusionFlags,
                usage,
            });
        }
    }
}
