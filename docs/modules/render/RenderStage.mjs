'use strict';

import {Mat4} from "../Mat4.mjs";
import {RenderObject} from "./RenderObject.mjs";

/**
 * Context encapsulating a WebGL context, RenderObjects, some properties
 * and methods for rendering
 */
export class RenderStage {
    /**
     * @param {WebGLRenderingContext} gl
     * @param {SceneObject[]} scene
     * @param {Object} properties
     * @property {number[]} [clearColor=[0.0, 0.0, 0.0, 0.0]]
     * @property {Mat4} [view=Mat4.identity()]
     * @property {number} [fieldOfView=90.0]
     * @property {number} [zNear=1.0]
     * @property {number} [zFar=Infinity]
     * @property {number} [inclusionFlags=~0]
     */
    constructor(gl, scene, {
        clearColor = [0.0, 0.0, 0.0, 0.0],
        view = Mat4.identity(),
        fieldOfView = 90.0,
        zNear = 1.0,
        zFar = Infinity,
        inclusionFlags = ~0,
        ...objectProperties
    }) {
        this.gl = gl;
        this.clearColor = clearColor;
        this.view = view;
        this.fieldOfView = fieldOfView;
        this.zNear = zNear;
        this.zFar = zFar;
        this.projection = null;
        this.renderObjects = [];

        this._fieldOfView = NaN;
        this._viewRange = NaN;
        this._aspectX = NaN;
        this._aspectY = NaN;
        this._zNear = NaN;
        this._zFar = NaN;

        this._initPerspective();

        for (const sceneObject of scene) {
            if (!(sceneObject.inclusionFlags & inclusionFlags)) {
                continue;
            }

            const renderObject = new RenderObject(sceneObject, this.gl, this,
                Object.assign({inclusionFlags}, objectProperties));

            this.renderObjects.push(renderObject);
        }
    }

    /**
     * Initialize perspective matrix with basic values
     *
     * @private
     *
     * @returns {void}
     */
    _initPerspective() {
        this._fieldOfView = 90.0;
        this._viewRange = 1.0;
        this._aspectX = 1.0;
        this._aspectY = 1.0;
        this._zNear = 1.0;
        this._zFar = Infinity;

        this.projection = new Mat4([
            1.0, 0.0, 0.0, 0.0,
            0.0, 1.0, 0.0, 0.0,
            0.0, 0.0, 1.0, 1.0,
            0.0, 0.0, -2.0, 0.0,
        ]);
    }

    /**
     * Adjust perspective matrix taking the current field of view and aspect ratio into account
     *
     * @private
     *
     * @param {number} aspectX
     * @param {number} aspectY
     *
     * @returns {void}
     */
    _adjustPerspectiveXY(aspectX, aspectY) {
        const fieldOfView = this.fieldOfView;

        const changedFieldOfView = fieldOfView !== this._fieldOfView;
        const changedAspectX = aspectX !== this._aspectX;
        const changedAspectY = aspectY !== this._aspectY;

        if (changedFieldOfView) {
            this._fieldOfView = fieldOfView;
            this._viewRange = Math.tan(Math.PI * 0.5 * (1.0 - fieldOfView / 180.0));
        }

        if (changedAspectX) { this._aspectX = aspectX; }
        if (changedAspectY) { this._aspectY = aspectY; }

        if (changedAspectX || changedFieldOfView) { this.projection[0] = this._viewRange * aspectX; }
        if (changedAspectY || changedFieldOfView) { this.projection[5] = this._viewRange * aspectY; }
    }

    /**
     * Adjust perspective matrix taking the current near and far plane into account
     *
     * @private
     *
     * @returns {void}
     */
    _adjustPerspectiveZW() {
        const zNear = this.zNear;
        const zFar = this.zFar;

        const changedZNear = zNear !== this._zNear;
        const changedZFar = zFar !== this._zFar;

        if (changedZNear) { this._zNear = zNear; }
        if (changedZFar) { this._zFar = zFar; }

        if (changedZFar || changedZNear) {
            this.projection[10] = (zFar < Infinity) ? (zNear + zFar) / (zFar - zNear) : 1.0;
            this.projection[14] = (zFar < Infinity) ? -2.0 * zNear * zFar / (zFar - zNear) : -2.0 * zNear;
        }
    }

    /**
     * Render objects with current settings
     *
     * @param {number} aspectX
     * @param {number} aspectY
     *
     * @returns {void}
     */
    render(aspectX, aspectY) {
        const gl = this.gl;

        this._adjustPerspectiveXY(aspectX, aspectY);
        this._adjustPerspectiveZW();

        gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
        gl.clearColor(...this.clearColor);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.enable(gl.CULL_FACE);
        gl.enable(gl.DEPTH_TEST);

        for (const obj of this.renderObjects) {
            gl.useProgram(obj.program);

            for (const command of obj.preparedCommands) {
                command(gl);
            }
        }
    }
}