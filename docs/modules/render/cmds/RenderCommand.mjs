'use strict';

/**
 * Render command in the context of an object
 *
 * For the user of the class, this is fairly abstract, while the actual
 * implementation can actually consist of any number of function calls.
 *
 * When a RenderStage selects a command for inclusion, it will prepare
 * commands tailored to the RenderObject in that particular context.
 *
 * @private
 */
export class _RenderCommand {
    /**
     * @param {Object} properties
     * @property {number} [inclusionFlags=~0]
     */
    constructor({inclusionFlags=~0}) {
        this.inclusionFlags = inclusionFlags;
    }

    /**
     * Prepare concrete commands for an object in a RenderStage
     *
     * @param {RenderObject} renderObject
     * @param {RenderStage} renderStage
     *
     * @returns {(function(WebGLRenderingContext):void)[]}
     */
    prepare(renderObject, renderStage) { // jshint ignore:line
        throw(Error("use a concrete implementation"));
    }
}
