'use strict';

import {RenderStage} from "./RenderStage.mjs";

/**
 * Context encapsulating a WebGL context, RenderObjects, some properties
 * and methods for rendering
 */
export class RenderContext {
    /**
     * @param {WebGLRenderingContext} gl
     * @param {SceneObject[]} scene
     * @param {Object[]} stages
     */
    constructor(gl, scene, stages) {
        this.gl = gl;
        this.aspectX = 1.0;
        this.aspectY = 1.0;
        this.renderStages = [];
        this.waitReady = null;

        this._adjustCanvas(true);

        for (const properties of stages) {
            this.renderStages.push(new RenderStage(gl, scene, properties));
        }

        this.waitReady = Promise.all(this.renderStages.map(stage => stage.waitReady));
    }

    /**
     * Ensure the backing buffer of the canvas has the right size
     *
     * @private
     *
     * @param {boolean} [force=false]
     *
     * @returns {boolean}
     */
    _adjustCanvas(force=false) {
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
     * Render stages with current settings
     *
     * @returns {void}
     */
    render() {
        const gl = this.gl;

        this._adjustCanvas();

        console.assert(gl.drawingBufferWidth === gl.canvas.width);
        console.assert(gl.drawingBufferHeight === gl.canvas.height);

        for (const stage of this.renderStages) {
            stage.render(this.aspectX, this.aspectY);
        }
    }
}
