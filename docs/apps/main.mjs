'use strict';

import * as render from "../modules/render/index.mjs";

import {Mat4} from "../modules/Mat4.mjs";

/**
 * Set up recurring rendering
 *
 * @param {SceneObject[]} scene
 * @param {RenderContext[]} renderContexts
 */
function startAnimationLoop(scene, renderContexts) {
    let then;

    /**
     * @callback FrameRequestCallback
     * @param {DOMHighResTimeStamp} now
     */
    const renderAnimationCallback = (now) => {
        const delta = (now - (then || now)) / 1000.0;
        const rot = Mat4.mul(
            Mat4.rotationX(now * 0.006),
            Mat4.rotationY(now * 0.007)
        );

        for (const obj of scene) {
            obj.matrix = rot;
        }

        try {
            for (const ctx of renderContexts) {
                ctx.render();
            }
        } catch (e) {
            console.error(e);
        }

        then = now;
        requestAnimationFrame(renderAnimationCallback);
    };

    requestAnimationFrame(renderAnimationCallback);
}

window.addEventListener('load', () => {
    /**
     * Semantic flags to determine what to render in which context
     *
     * @enum {number}
     * @readonly
     */
    const renderInclusion = {
        NORMAL: 1 << 0,
        EYE_VIEW: 1 << 1,
        STEREOGRAM: 1 << 2,
    };

    const scene = [
        new render.SceneObject(
            [
                new render.CmdUniformMatrix('u_model_matrix', 'matrix', {
                    source: render.uniformSource.SCENE_OBJECT,
                }),
                new render.CmdUniformMatrix('u_view_matrix', 'view', {
                    source: render.uniformSource.RENDER_STAGE,
                }),
                new render.CmdUniformMatrix('u_projection_matrix', 'projection', {
                    source: render.uniformSource.RENDER_STAGE,
                }),
                new render.CmdSetAttrib('a_position', 'main', {
                    size: 3,
                    stride: 6,
                }),
                new render.CmdSetAttrib('a_color', 'main', {
                    size: 3,
                    stride: 6,
                    offset: 3,
                }),
                new render.CmdDrawElements('main', render.drawMode.TRIANGLES),
            ],
            {
                main: {
                    data: [
                        -0.5, -0.5, -0.5,   1.0, 0.0, 0.0,
                         0.5, -0.5, -0.5,   1.0, 0.0, 0.0,
                        -0.5,  0.5, -0.5,   1.0, 0.0, 0.0,
                         0.5,  0.5, -0.5,   1.0, 0.0, 0.0,

                         0.5, -0.5, -0.5,   1.0, 0.0, 1.0,
                         0.5, -0.5,  0.5,   1.0, 0.0, 1.0,
                         0.5,  0.5, -0.5,   1.0, 0.0, 1.0,
                         0.5,  0.5,  0.5,   1.0, 0.0, 1.0,

                        -0.5,  0.5, -0.5,   0.0, 1.0, 0.0,
                         0.5,  0.5, -0.5,   0.0, 1.0, 0.0,
                        -0.5,  0.5,  0.5,   0.0, 1.0, 0.0,
                         0.5,  0.5,  0.5,   0.0, 1.0, 0.0,

                        -0.5, -0.5, -0.5,   0.0, 1.0, 1.0,
                        -0.5,  0.5, -0.5,   0.0, 1.0, 1.0,
                        -0.5, -0.5,  0.5,   0.0, 1.0, 1.0,
                        -0.5,  0.5,  0.5,   0.0, 1.0, 1.0,

                        -0.5, -0.5, -0.5,   1.0, 1.0, 0.0,
                        -0.5, -0.5,  0.5,   1.0, 1.0, 0.0,
                         0.5, -0.5, -0.5,   1.0, 1.0, 0.0,
                         0.5, -0.5,  0.5,   1.0, 1.0, 0.0,

                        -0.5, -0.5,  0.5,   1.0, 1.0, 1.0,
                        -0.5,  0.5,  0.5,   1.0, 1.0, 1.0,
                         0.5, -0.5,  0.5,   1.0, 1.0, 1.0,
                         0.5,  0.5,  0.5,   1.0, 1.0, 1.0,
                    ],
                },
            },
            {
                main: {
                    indices: [
                         0,  1,  2,    3,  2,  1,
                         4,  5,  6,    7,  6,  5,
                         8,  9, 10,   11, 10,  9,
                        12, 13, 14,   15, 14, 13,
                        16, 17, 18,   19, 18, 17,
                        20, 21, 22,   23, 22, 21,
                    ],
                },
            },
            {
                inclusionFlags: renderInclusion.NORMAL | renderInclusion.EYE_VIEW,
            }
        ),
        new render.SceneObject(
            [
                new render.CmdSetAttrib('a_position', 'main', {
                    size: 2,
                }),
                new render.CmdDrawElements('main', render.drawMode.TRIANGLE_STRIP),
            ],
            {
                main: {
                    data: [
                        -1, -1,
                         1, -1,
                        -1,  1,
                         1,  1,
                    ],
                },
            },
            {
                main: {
                    indices: [0, 1, 2, 3],
                },
            },
            {
                inclusionFlags: renderInclusion.STEREOGRAM,
            }
        ),
    ];

    const contextDescriptions = new Map([
        ['#render', [
            {
                view: Mat4.translation(0.0, 0.0, 2.0),
                fragmentShaderUrl: 'shaders/fragment.frag',
                zNear: 1.0,
                zFar: 3.0,
                inclusionFlags: renderInclusion.NORMAL,
            }
        ]],
        ['#left_eye', [
            {
                view: Mat4.translation(0.25, 0.0, 2.0),
                fragmentShaderUrl: 'shaders/depthmap.frag',
                clearColor: [1.0, 1.0, 1.0, 1.0,],
                zNear: 1.0,
                zFar: 3.0,
                inclusionFlags: renderInclusion.EYE_VIEW,
            }
        ]],
        ['#right_eye', [
            {
                view: Mat4.translation(-0.25, 0.0, 2.0),
                fragmentShaderUrl: 'shaders/depthmap.frag',
                clearColor: [1.0, 1.0, 1.0, 1.0,],
                zNear: 1.0,
                zFar: 3.0,
                inclusionFlags: renderInclusion.EYE_VIEW,
            }
        ]],
        ['#stereogram', [
            {
                view: Mat4.translation(0.25, 0.0, 2.0),
                fragmentShaderUrl: 'shaders/depthmap.frag',
                clearColor: [1.0, 1.0, 1.0, 1.0,],
                zNear: 1.0,
                zFar: 3.0,
                inclusionFlags: renderInclusion.EYE_VIEW,
                frameBuffer: true,
            },
            {
                view: Mat4.translation(-0.25, 0.0, 2.0),
                fragmentShaderUrl: 'shaders/depthmap.frag',
                clearColor: [1.0, 1.0, 1.0, 1.0,],
                zNear: 1.0,
                zFar: 3.0,
                inclusionFlags: renderInclusion.EYE_VIEW,
                frameBuffer: true,
            },
            {
                vertexShaderUrl: 'shaders/plain.vert',
                fragmentShaderUrl: 'shaders/stereogram.frag',
                clearColor: [0.0, 1.0, 0.0, 1.0,],
                zNear: 1.0,
                zFar: 3.0,
                inclusionFlags: renderInclusion.STEREOGRAM,
            }
        ]],
    ]);

    const renderContexts = render.buildRenderContexts(scene, contextDescriptions);
    const waitReady = Promise.all(renderContexts.map(context => context.waitReady));
    waitReady.then(() => startAnimationLoop(scene, renderContexts),
        (e) => {console.error(e);});
});
