'use strict';

import {bufferUsage} from "./enums/bufferUsage.mjs";
import {compileAndLinkProgram} from "./shaderUtils.mjs";
import {CmdDrawElements} from "./cmds/draw/CmdDrawElements.mjs";
import {CmdSetAttrib} from "./cmds/attribs/CmdSetAttrib.mjs";

/**
 * Renderable instance of a scene object home to a particular WebGL context
 */
export class RenderObject {
    /**
     * @param {SceneObject} sceneObject
     * @param {WebGLRenderingContext} gl
     * @param {RenderStage} renderStage
     * @param {Object} properties
     * @property {number} inclusionFlags
     * @property {string} vertexShaderUrl
     * @property {string} fragmentShaderUrl
     */
    constructor(sceneObject, gl, renderStage, {
        inclusionFlags,
        vertexShaderUrl = 'shaders/vertex.vert',
        fragmentShaderUrl = 'shaders/fragment.frag',
    }) {
        this.sceneObject = sceneObject;
        this.program = compileAndLinkProgram(gl, vertexShaderUrl, fragmentShaderUrl);
        this.uniforms = new Map();
        this.attribs = new Map();
        this.attribBuffers = new Map();
        this.elementBuffers = new Map();
        this.preparedCommands = [];

        RenderObject._determineUniforms(this.uniforms, gl, this.program);
        RenderObject._determineAttribs(this.attribs, gl, this.program);

        const relevantCommands = this.sceneObject.renderCommands
            .filter(command => command.inclusionFlags & inclusionFlags);

        const usedAttribBuffers = RenderObject._determineUsedAttribBuffers(relevantCommands, this.attribs);
        const usedElementBuffers = RenderObject._determineUsedElementBuffers(relevantCommands);

        RenderObject._allocateAttribBuffers(this.attribBuffers, gl,
            usedAttribBuffers, this.sceneObject.attribArrays);

        RenderObject._allocateElementBuffers(this.elementBuffers, gl,
            usedElementBuffers, this.sceneObject.elementArrays);

        for (const command of relevantCommands) {
            this.preparedCommands.push(...command.prepare(this, renderStage));
        }
    }

    /**
     * Determine shader program uniforms and map their name to their metadata
     *
     * @private
     *
     * @param {Map<string, Object>} uniforms
     * @param {WebGLRenderingContext} gl
     * @param {WebGLProgram} program
     */
    static _determineUniforms(uniforms, gl, program) {
        const numUniforms = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);

        for (let index = 0; index < numUniforms; index++) {
            const {name, type, size: count} = gl.getActiveUniform(program, index);
            const location = gl.getUniformLocation(program, name);

            uniforms.set(name, {
                location,
                type,
                count,
            });
        }
    }

    /**
     * Determine shader program attribs and map their name to their metadata
     *
     * @private
     *
     * @param {Map<string, Object>} attribs
     * @param {WebGLRenderingContext} gl
     * @param {WebGLProgram} program
     */
    static _determineAttribs(attribs, gl, program) {
        const numAttribs = gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES);

        for (let index = 0; index < numAttribs; index++) {
            const {name, type, size: count} = gl.getActiveAttrib(program, index);
            const location = gl.getAttribLocation(program, name);

            attribs.set(name, {
                location,
                type,
                size: RenderObject._getGLTypeSize(gl, type),
                count,
            });
        }
    }

    /**
     * Determine how many numbers a WebGL type consists of.
     *
     * @private
     *
     * @param {WebGLRenderingContext} gl
     * @param {GLenum} type
     *
     * @returns {number}
     */
    static _getGLTypeSize(gl, type) {
        switch (type) {
            case gl.FLOAT:
                return 1;
            case gl.FLOAT_VEC2:
                return 2;
            case gl.FLOAT_VEC3:
                return 3;
            case gl.FLOAT_VEC4:
                return 4;
            default:
                throw TypeError("unsupported WebGL type");
        }
    }

    /**
     * Determine attrib buffers used by the relevant render commands
     *
     * @private
     *
     * @param {_RenderCommand[]} commands
     * @param {Map<string, Object>} attribs
     *
     * @returns {Set<string>}
     */
    static _determineUsedAttribBuffers(commands, attribs) {
        const usedBuffers = new Set();

        for (const command of commands) {
            if (!(command instanceof CmdSetAttrib)) {
                continue;
            }

            if (!attribs.has(command.attribName)) {
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
     * @param {_RenderCommand[]} commands
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
     * @param {Map<string, Object>} attribBuffers
     * @param {WebGLRenderingContext} gl
     * @param {Set<string>} keys
     * @param {Map<string, Object>} attribArrays
     */
    static _allocateAttribBuffers(attribBuffers, gl, keys, attribArrays) {
        for (const key of keys) {
            const {data, usage} = attribArrays.get(key);
            const buffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
            gl.bufferData(gl.ARRAY_BUFFER, data, bufferUsage.toGLUsage(gl, usage));

            const {byteSize, type} = RenderObject._getBufferSpecs(gl, data);
            attribBuffers.set(key, {
                buffer,
                byteSize,
                type,
                length: data.length,
            });
        }

        gl.bindBuffer(gl.ARRAY_BUFFER, null);
    }

    /**
     * Allocate and fill element buffers
     *
     * @private
     *
     * @param {Map<string, Object>} elementBuffers
     * @param {WebGLRenderingContext} gl
     * @param {Set<string>} keys
     * @param {Map<string, Object>} elementArrays
     */
    static _allocateElementBuffers(elementBuffers, gl, keys, elementArrays) {
        for (const key of keys) {
            const {indices, usage} = elementArrays.get(key);
            const buffer = gl.createBuffer();
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffer);
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, bufferUsage.toGLUsage(gl, usage));

            const {byteSize, type} = RenderObject._getBufferSpecs(gl, indices);
            elementBuffers.set(key, {
                buffer,
                byteSize,
                type,
                length: indices.length,
            });
        }

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
    }

    /**
     * Determine specifications of a typed array
     * when used as a buffer in a WebGL context.
     *
     * @private
     *
     * @param {WebGLRenderingContext} gl
     * @param {ArrayBuffer} bufferArray
     *
     * @returns {Object}
     * @property {number} byteSize
     * @property {GLenum} type
     */
    static _getBufferSpecs(gl, bufferArray) {
        if (bufferArray instanceof Uint8Array) {
            return {byteSize: 1, type: gl.UNSIGNED_BYTE};
        }
        if (bufferArray instanceof Uint16Array) {
            return {byteSize: 2, type: gl.UNSIGNED_SHORT};
        }
        if (bufferArray instanceof Float32Array) {
            return {byteSize: 4, type: gl.FLOAT};
        }
        if (bufferArray instanceof Int8Array) {
            return {byteSize: 1, type: gl.BYTE};
        }
        if (bufferArray instanceof Int16Array) {
            return {byteSize: 2, type: gl.SHORT};
        }

        throw Error("unsupported buffer array type");
    }
}
