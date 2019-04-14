'use strict';

/**
 * Object within which CmdUniform* should look for its value
 *
 * @enum {number}
 * @readonly
 */
export const uniformSource = {
    RENDER_OBJECT: 1,
    RENDER_STAGE: 2,
    SCENE_OBJECT: 3,
    FIRST_FOUND: 0,

    /**
     * Get a callback that fetches the value from a named property of the specified source uniform
     *
     * @param {uniformSource} source
     * @param {string} name
     * @param {RenderObject} renderObject
     * @param {RenderStage} renderStage
     *
     * @returns {function():*}
     */
    getPropertyReader(source, name, renderObject, renderStage) {
        let candidates;

        switch (source) {
            case uniformSource.RENDER_OBJECT:
                candidates = [renderObject];
                break;

            case uniformSource.RENDER_STAGE:
                candidates = [renderStage];
                break;

            case uniformSource.SCENE_OBJECT:
                candidates = [renderObject.sceneObject];
                break;

            case uniformSource.FIRST_FOUND:
                candidates = [renderObject, renderStage, renderObject.sceneObject];
                break;

            default:
                throw RangeError("unsupported uniform source");
        }

        for (const obj of candidates) {
            if (name in obj) {
                return uniformSource._makePropertyReader(obj, name);
            }
        }

        throw ReferenceError(`property "${name}" not found`);
    },

    /**
     * @private
     *
     * @param {Object} obj
     * @param {string} name
     *
     * @returns {function():*}
     */
    _makePropertyReader(obj, name) {
        return () => obj[name];
    }
};
