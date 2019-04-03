
attribute vec4 a_position;
attribute vec4 a_color;

uniform mat4 u_model_matrix;
uniform mat4 u_view_matrix;
uniform mat4 u_projection_matrix;

varying vec4 v_color;

void main() {
    gl_Position = u_projection_matrix * u_view_matrix * u_model_matrix * a_position;

    v_color = a_color;
}
