import { rcHeightfield, rcSpan } from '@recast-navigation/core';
import {
  BoxGeometry,
  Color,
  ColorRepresentation,
  DynamicDrawUsage,
  Group,
  InstancedMesh,
  Material,
  Matrix4,
  MeshBasicMaterial,
  Vector3Tuple,
} from 'three';

const tmpMatrix4 = new Matrix4();

export type HeightfieldHelperParams = {
  heightfields: rcHeightfield[];

  /**
   * @default false
   */
  highlightWalkable?: boolean;

  /**
   * @default 'blue'
   */
  defaultColor?: ColorRepresentation;

  /**
   * @default 'green'
   */
  walkableColor?: ColorRepresentation;

  /**
   * @default MeshBasicMaterial
   */
  material?: Material;
};

export class HeightfieldHelper {
  heightfields: Group;

  recastHeightfields: rcHeightfield[];

  highlightWalkable: boolean;

  defaultColor: Color;
  
  walkableColor: Color;

  material: Material;

  constructor({
    heightfields,
    highlightWalkable = false,
    material = new MeshBasicMaterial(),
    defaultColor = 'blue',
    walkableColor = 'green',
  }: HeightfieldHelperParams) {
    this.heightfields = new Group();
    this.recastHeightfields = heightfields;
    this.highlightWalkable = highlightWalkable;
    this.material = material;
    this.defaultColor = new Color(defaultColor);
    this.walkableColor = new Color(walkableColor);
  }

  updateHeightfield(): void {
    this.heightfields.clear();

    for (const hf of this.recastHeightfields) {
      const orig = hf.bmin();
      const cs = hf.cs();
      const ch = hf.ch();

      const width = hf.width();
      const height = hf.height();

      const boxes: {
        position: Vector3Tuple;
        walkable: boolean;
      }[] = [];

      for (let y = 0; y < height; ++y) {
        for (let x = 0; x < width; ++x) {
          const fx = orig.x + x * cs;
          const fz = orig.z + y * cs;

          let span: rcSpan | null = hf.spans(x + y * width);

          while (span) {
            const minX = fx;
            const minY = orig.y + span.smin() * ch;
            const minZ = fz;

            const maxX = fx + cs;
            const maxY = orig.y + span.smax() * ch;
            const maxZ = fz + cs;

            boxes.push({
              position: [
                (maxX + minX) / 2,
                (maxY + minY) / 2,
                (maxZ + minZ) / 2,
              ],
              walkable: this.highlightWalkable && span.area() !== 0,
            });

            span = span.next();
          }
        }
      }

      const geometry = new BoxGeometry(cs, ch, cs);

      const instancedMesh = new InstancedMesh(
        geometry,
        this.material,
        boxes.length
      );
      instancedMesh.instanceMatrix.setUsage(DynamicDrawUsage);

      for (let i = 0; i < boxes.length; i++) {
        const { position, walkable } = boxes[i];

        instancedMesh.setMatrixAt(i, tmpMatrix4.setPosition(...position));
        instancedMesh.setColorAt(
          i,
          walkable ? this.walkableColor : this.defaultColor
        );
      }

      instancedMesh.instanceMatrix.needsUpdate = true;

      if (instancedMesh.instanceColor) {
        instancedMesh.instanceColor.needsUpdate = true;
      }

      this.heightfields.add(instancedMesh);
    }
  }
}
