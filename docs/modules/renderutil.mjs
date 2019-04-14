'use strict';

import {RenderContext} from "./render/render.mjs";

/**
 * Build render contexts
 *
 * @param {SceneObject[]} scene
 * @param {(Object.<string, Object>|Iterable.<string, Object>)} contextDescriptions
 *
 * @returns {RenderContext[]}
 */
export function buildRenderContexts(scene, contextDescriptions) {
    /** @type {HTMLCanvasElement[]} */
    const canvasList = Array.from(document.getElementsByTagName('canvas'));

    const renderContexts = [];

    for (const [selector, stages] of contextDescriptions[Symbol.iterator] === undefined ?
        Object.entries(contextDescriptions) : contextDescriptions
    ) {
        const matchList = canvasList.filter(element => element.matches(selector));
        if (matchList.length === 0) {
            throw ReferenceError("selector matches no canvas");
        }
        if (matchList.length > 1) {
            throw ReferenceError("selector matches more than one canvas");
        }

        const canvas = matchList[0];
        const gl = canvas.getContext('webgl');
        if (gl === null) {
            throw Error("cannot get WebGL context for canvas");
        }

        renderContexts.push(new RenderContext(gl, scene, stages));
    }

    return renderContexts;
}
