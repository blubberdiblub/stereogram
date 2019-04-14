'use strict';

import {_RenderCommand} from "../RenderCommand.mjs";
import {uniformSource} from "../../enums/uniformSource.mjs";

/**
 * Base class for all uniform commands
 *
 * @private
 */
export class _CmdUniform extends _RenderCommand {
    /**
     * @param {string} uniformName
     * @param {Object} properties
     * @property {uniformSource} [source=uniformSource.FIRST_FOUND]
     */
    constructor(uniformName, {source=uniformSource.FIRST_FOUND, ...rest}) {
        super(rest);

        this.uniformName = uniformName;
        this.source = source;
    }
}
