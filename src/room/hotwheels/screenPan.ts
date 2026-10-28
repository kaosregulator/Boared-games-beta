/**
 * Bird's-eye panning on the arrow keys, relative to the picture: Up slides
 * the view up the screen, Right slides it right, whichever way the car (and
 * so the overhead camera) is facing. The camera's forward, flattened onto
 * the floor, is "up the screen"; the floor direction to its right is "right".
 */

export interface FloorMove {
  x: number;
  z: number;
}

/**
 * World-space floor movement for one step of the arrows.
 * `forwardX`/`forwardZ`: the camera's view direction on the floor (any length).
 * `up`/`right`: -1, 0 or 1 from the arrow keys. `fallback`: a floor direction
 * to use when the camera looks straight down (the car's heading).
 */
export function screenPan(forwardX: number, forwardZ: number, up: number, right: number, fallback: FloorMove = { x: 0, z: -1 }): FloorMove {
  let fx = forwardX;
  let fz = forwardZ;
  let len = Math.hypot(fx, fz);
  if (len < 1e-4) {
    fx = fallback.x;
    fz = fallback.z;
    len = Math.hypot(fx, fz) || 1;
  }
  fx /= len;
  fz /= len;
  // Screen right on the floor: forward × world up = (-fz, fx).
  const rx = -fz;
  const rz = fx;
  return { x: fx * up + rx * right, z: fz * up + rz * right };
}
