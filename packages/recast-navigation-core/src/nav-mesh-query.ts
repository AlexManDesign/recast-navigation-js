import { NavMesh } from './nav-mesh';
import { Arrays, Raw } from './raw';
import type R from './raw-module';
import { array, vec3, Vector3 } from './utils';

export class QueryFilter {
  raw: R.dtQueryFilter;

  get includeFlags(): number {
    return this.raw.getIncludeFlags();
  }

  set includeFlags(flags: number) {
    this.raw.setIncludeFlags(flags);
  }

  get excludeFlags(): number {
    return this.raw.getExcludeFlags();
  }

  set excludeFlags(flags: number) {
    this.raw.setExcludeFlags(flags);
  }

  constructor(raw?: R.dtQueryFilter) {
    this.raw = raw ?? new Raw.Module.dtQueryFilter();
  }

  getAreaCost(i: number): number {
    return this.raw.getAreaCost(i);
  }

  setAreaCost(i: number, cost: number): void {
    return this.raw.setAreaCost(i, cost);
  }
}

export type NavMeshQueryParams = {
  navMesh: NavMesh;

  /**
   * @default 2048
   */
  maxNodes?: number;
};

export class NavMeshQuery {
  raw: R.NavMeshQuery;

  /**
   * Default query filter.
   */
  defaultFilter: QueryFilter;

  /**
   * Default search distance along each axis.
   */
  defaultQueryHalfExtents = { x: 1, y: 1, z: 1 };

  constructor(value: R.NavMeshQuery | NavMeshQueryParams) {
    if (value instanceof Raw.Module.NavMeshQuery) {
      this.raw = value;
    } else {
      this.raw = new Raw.Module.NavMeshQuery();
      this.raw.init(value.navMesh.raw, value.maxNodes ?? 2048);
    }

    this.defaultFilter = new QueryFilter();
    this.defaultFilter.includeFlags = 0xffff;
    this.defaultFilter.excludeFlags = 0;
  }

  /**
   * Finds the polygon nearest to the given position.
   */
  findNearestPoly(
    position: Vector3,
    options?: {
      /**
       * The polygon filter to apply to the query.
       * @default this.defaultFilter
       */
      filter?: QueryFilter;
      
      /**
       * The search distance along each axis. [(x, y, z)]
       * @default this.defaultQueryHalfExtents
       */
      halfExtents?: Vector3;
    }
  ) {
    const nearestRef = new Raw.UnsignedIntRef();
    const nearestPoint = new Raw.Vec3();
    const isOverPoly = new Raw.BoolRef();

    const status = this.raw.findNearestPoly(
      vec3.toArray(position),
      vec3.toArray(options?.halfExtents ?? this.defaultQueryHalfExtents),
      options?.filter?.raw ?? this.defaultFilter.raw,
      nearestRef,
      nearestPoint,
      isOverPoly
    );

    return {
      success: Raw.Detour.statusSucceed(status),
      status,
      nearestRef: nearestRef.value,
      nearestPoint: vec3.fromRaw(nearestPoint),
      isOverPoly: isOverPoly.value,
    };
  }

  /**
   * Finds the polygons along the navigation graph that touch the specified circle.
   * @param startRef Reference of polygon to start search from
   * @param centerPos Center of circle
   * @param radius Radius of circle
   * @param options
   */
  findPolysAroundCircle(
    startRef: number,
    centerPos: Vector3,
    radius: number,
    options?: {
      /**
       * The polygon filter to apply to the query.
       * @default this.defaultFilter
       */
      filter?: QueryFilter;

      /**
       * The maximum number of polygons the result arrays can hold.
       * @default 256
       */
      maxPolys?: number;
    }
  ) {
    const filter = options?.filter ?? this.defaultFilter;
    const maxPolys = options?.maxPolys ?? 256;

    const resultRef = new Arrays.UnsignedIntArray();
    const resultParent = new Arrays.UnsignedIntArray();;
    resultRef.resize(maxPolys);
    resultParent.resize(maxPolys);
    const resultCostRef = new Raw.FloatRef();
    const resultCountRef = new Raw.IntRef();

    const status = this.raw.findPolysAroundCircle(
      startRef,
      vec3.toArray(centerPos),
      radius,
      filter.raw,
      resultRef,
      resultParent,
      resultCostRef,
      resultCountRef,
      maxPolys,
    );

    const resultCost = resultCostRef.value;
    const resultCount = resultCountRef.value;

    return {
      success: Raw.Detour.statusSucceed(status),
      status,
      resultRefs: array((i) => resultRef.get(i), resultCount),
      resultParents: array((i) => resultParent.get(i), resultCount),
      resultCost,
      resultCount,
    };
  }

  /**
   * Finds polygons that overlap the search box.
   * @param center The center of the search box
   * @param halfExtents The search distance along each axis
   * @param options
   */
  queryPolygons(
    center: Vector3,
    halfExtents: Vector3,
    options?: {
      /**
       * The polygon filter to apply to the query.
       * @default this.defaultFilter
       */
      filter?: QueryFilter;

      /**
       * The maximum number of polygons the search result can hold.
       * @default 256
       */
      maxPolys?: number;
    }
  ) {
    const filter = options?.filter ?? this.defaultFilter;
    const maxPolys = options?.maxPolys ?? 256;

    const polysRef = new Arrays.UnsignedIntArray();
    polysRef.resize(maxPolys);
    const polyCountRef = new Raw.IntRef();
      
    const status = this.raw.queryPolygons(
      vec3.toArray(center),
      vec3.toArray(halfExtents),
      filter.raw,
      polysRef,
      polyCountRef,
      maxPolys,
    );

    const polyCount = polyCountRef.value;

    return {
      success: Raw.Detour.statusSucceed(status),
      status,
      polyRefs: array((i) => polysRef.get(i), polyCount),
      polyCount,
    };
  }

  /**
   * Returns the closest point on the given polygon to the given position.
   * 
   * @param polyRef The reference of the polygon
   * @param position The position to find the closest point to
   */
  closestPointOnPoly(polyRef: number, position: Vector3) {
    const closestPoint = new Raw.Vec3();
    const positionOverPoly = new Raw.BoolRef();

    const status = this.raw.closestPointOnPoly(
      polyRef,
      vec3.toArray(position),
      closestPoint,
      positionOverPoly
    );

    return {
      success: Raw.Detour.statusSucceed(status),
      status,
      closestPoint: vec3.fromRaw(closestPoint),
      posOverPoly: positionOverPoly.value,
    };
  }

  /**
   * Returns the closest point on the NavMesh to the given position.
   */
  getClosestPoint(
    position: Vector3,
    options?: {
      /**
       * The polygon filter to apply to the query.
       * @default this.defaultFilter
       */
      filter?: QueryFilter;
      
      /**
       * The search distance along each axis. [(x, y, z)]
       * @default this.defaultQueryHalfExtents
       */
      halfExtents?: Vector3;
    }
  ): Vector3 {
    const closestPointRaw = this.raw.getClosestPoint(
      vec3.toArray(position),
      vec3.toArray(options?.halfExtents ?? this.defaultQueryHalfExtents),
      options?.filter?.raw ?? this.defaultFilter.raw
    );

    return vec3.fromRaw(closestPointRaw);
  }

  /**
   * Returns a random point on the NavMesh within the given radius of the given position.
   */
  getRandomPointAround(
    position: Vector3,
    radius: number,
    options?: {
      /**
       * The polygon filter to apply to the query.
       * @default this.defaultFilter
       */
      filter?: QueryFilter;
      
      /**
       * The search distance along each axis. [(x, y, z)]
       * @default this.defaultQueryHalfExtents
       */
      halfExtents?: Vector3;
    }
  ): Vector3 {
    const randomPointRaw = this.raw.getRandomPointAround(
      vec3.toArray(position),
      radius,
      vec3.toArray(options?.halfExtents ?? this.defaultQueryHalfExtents),
      options?.filter?.raw ?? this.defaultFilter.raw
    );

    return vec3.fromRaw(randomPointRaw);
  }

  /**
   * Moves from the start to the end position constrained to the navigation mesh.
   * 
   * @param startRef The reference id of the start polygon.
   * @param startPosition A position of the mover within the start polygon.
   * @param endPosition The desired end position of the mover.
   * 
   * @returns The result of the move along surface operation.
   */
  moveAlongSurface(
    startRef: number,
    startPosition: Vector3,
    endPosition: Vector3,
    options?: {
      /**
       * The polygon filter to apply to the query.
       * @default this.defaultFilter
       */
      filter?: QueryFilter;

      /**
       * The maximum number of polygons the output visited array can hold.
       * @default 256
       */
      maxVisitedSize?: number;
    }
  ) {
    const maxVisitedSize = options?.maxVisitedSize ?? 256

    const resultPosition = new Raw.Vec3();
    const visited = new Arrays.UnsignedIntArray();

    const filter = options?.filter?.raw ?? this.defaultFilter.raw;

    const status = this.raw.moveAlongSurface(
      startRef,
      vec3.toArray(startPosition),
      vec3.toArray(endPosition),
      filter,
      resultPosition,
      visited,
      maxVisitedSize
    );

    return {
      success: Raw.Detour.statusSucceed(status),
      status,
      resultPosition: vec3.fromRaw(resultPosition),
      visited: array((i) => visited.get(i), visited.size),
    };
  }

  /**
   * Returns a random point on the navmesh.
   * @param options additional options
   * @returns a random point on the navmesh
   */
  findRandomPoint(options?: {
    /**
     * The polygon filter to apply to the query.
     * @default this.defaultFilter
     */
    filter?: QueryFilter;
  }) {
    const randomPolyRef = new Raw.UnsignedIntRef();
    const randomPoint = new Raw.Vec3();

    const status = this.raw.findRandomPoint(
      options?.filter?.raw ?? this.defaultFilter.raw,
      randomPolyRef,
      randomPoint
    );

    return {
      success: Raw.Detour.statusSucceed(status),
      status,
      randomPolyRef: randomPolyRef.value,
      randomPoint: vec3.fromRaw(randomPoint),
    };
  }


  /**
   * Gets the height of the polygon at the provided position using the height detail.
   * 
   * @param polyRef The reference id of the polygon.
   * @param position A position within the xz-bounds of the polygon.
   */
  getPolyHeight(polyRef: number, position: Vector3) {
    const floatRef = new Raw.FloatRef();
    const status = this.raw.getPolyHeight(
      polyRef,
      vec3.toArray(position),
      floatRef
    );

    return {
      success: Raw.Detour.statusSucceed(status),
      status,
      height: floatRef.value,
    };
  }

  /**
   * Finds a straight path from the start position to the end position.
   *
   * @param start The start position.
   * @param end The end position.
   * 
   * @returns an array of Vector3 positions that make up the path, or an empty array if no path was found.
   */
  computePath(
    start: Vector3,
    end: Vector3,
    options?: {
      /**
       * The polygon filter to apply to the query.
       * @default this.defaultFilter
       */
      filter?: QueryFilter;

      /**
       * The maximum number of polygons the path array can hold. [Limit: >= 1]
       * @default 256
       */
      maxPathPolys?: number;

      /**
       * The maximum number of points the straight path arrays can hold. [Limit: > 0]
       * @default 256
       */
      maxStraightPathPoints?: number;
    }
  ): {
    /**
     * Whether a path was successfully computed.
     */
    success: boolean;
    
    /**
     * Error information if the path computation failed.
     */
    error?: {
      /**
       * Description of the error.
       */
      name: string,

      /**
       * A dtStatus status code if relevant.
       */
      status?: number;
    }

    /**
     * The result path.
     */
    path: Vector3[]
  } {
    const filter = options?.filter ?? this.defaultFilter;

    // find nearest polygons for start and end positions
    const startNearestPolyResult = this.findNearestPoly(start, { filter });

    if (!startNearestPolyResult.success) {
      return {
        success: false,
        error: {
          name: 'findNearestPoly for start position failed',
          status: startNearestPolyResult.status,
        },
        path: [],
      }
    }

    const endNearestPolyResult = this.findNearestPoly(end, { filter });

    if (!endNearestPolyResult.success) {
      return {
        success: false,
        error: {
          name: 'findNearestPoly for end position failed',
          status: endNearestPolyResult.status,
        },
        path: [],
      }
    }

    const startRef = startNearestPolyResult.nearestRef;
    const endRef = endNearestPolyResult.nearestRef;

    // find polygon path
    const maxPathPolys = options?.maxPathPolys ?? 256;

    const findPathResult = this.findPath(startRef, endRef, start, end, { filter, maxPathPolys });

    if (!findPathResult.success) {
      return {
        success: false,
        error: {
          name: 'findPath unsuccessful',
          status: findPathResult.status,
        },
        path: [],
      }
    }

    if (findPathResult.polys.size <= 0) {
      return {
        success: false,
        error: {
          name: 'no polygon path found',
        },
        path: [],
      }
    }

    const lastPoly = findPathResult.polys.get(findPathResult.polys.size - 1);

    let closestEnd = { x: end.x, y: end.y, z: end.z };

    if (lastPoly !== endRef) {
      const lastPolyClosestPointResult = this.closestPointOnPoly(lastPoly, end);

      if (!lastPolyClosestPointResult.success) {
        return {
          success: false,
          error: {
            name: 'no closest point on last polygon found',
            status: lastPolyClosestPointResult.status,
          },
          path: [],
        }
      }

      closestEnd = lastPolyClosestPointResult.closestPoint;
    }

    // find straight path
    const maxStraightPathPoints = options?.maxStraightPathPoints;

    const findStraightPathResult = this.findStraightPath(start, closestEnd, findPathResult.polys, { maxStraightPathPoints });

    if (!findStraightPathResult.success) {
      return {
        success: false,
        error: {
          name: 'findStraightPath unsuccessful',
          status: findStraightPathResult.status,
        },
        path: [],
      }
    }

    const { straightPath, straightPathCount } = findStraightPathResult;

    // format output
    const points: Vector3[] = [];

    for (let i = 0; i < straightPathCount; i++) {
      points.push({
        x: straightPath.get(i * 3),
        y: straightPath.get(i * 3 + 1),
        z: straightPath.get(i * 3 + 2),
      });
    }

    return {
      success: true,
      path: points,
    }
  }

  /**
   * Finds a path from the start polygon to the end polygon.
   * @param startRef the reference id of the start polygon.
   * @param endRef the reference id of the end polygon.
   * @param startPosition position within the start polygon.
   * @param endPosition position within the end polygon.
   * @param options additional options
   * @returns 
   */
  findPath(
    startRef: number,
    endRef: number,
    startPosition: Vector3,
    endPosition: Vector3,
    options?: {
      /**
       * The polygon filter to apply to the query.
       * @default this.defaultFilter
       */
      filter?: QueryFilter;

      /**
       * The maximum number of polygons the path array can hold. [Limit: >= 1]
       * @default 256
       */
      maxPathPolys?: number;
    }
  ) {
    const filter = options?.filter ?? this.defaultFilter;
    const maxPathPolys = options?.maxPathPolys ?? 256;

    const polys = new Arrays.UnsignedIntArray();
    polys.resize(maxPathPolys);

    const status = this.raw.findPath(
      startRef,
      endRef,
      vec3.toArray(startPosition),
      vec3.toArray(endPosition),
      filter.raw,
      polys,
      maxPathPolys
    );

    return {
      success: Raw.Detour.statusSucceed(status),
      status,
      polys,
    };
  }

  /**
   * Finds the straight path from the start to the end position within the polygon corridor.
   *
   * This method peforms what is often called 'string pulling'.
   * 
   * The start position is clamped to the first polygon in the path, and the
   * end position is clamped to the last. So the start and end positions should 
   * normally be within or very near the first and last polygons respectively.
   *
   * The returned polygon references represent the reference id of the polygon 
   * that is entered at the associated path position. The reference id associated 
   * with the end point will always be zero.  This allows, for example, matching 
   * off-mesh link points to their representative polygons.
   * 
   * If the provided result arrays are too small for the entire result set, 
   * they will be filled as far as possible from the start toward the end 
   * position.
   *
   * @param start path start position
   * @param end path end position
   * @param path an array of polygon references that represent the path corridor
   * @param options additional options
   * @returns the straight path result
   */
  findStraightPath(
    start: Vector3,
    end: Vector3,
    path: R.UnsignedIntArray,
    options?: {
      /**
       * The maximum number of points the straight path arrays can hold. [Limit: > 0]
       * @default 256
       */
      maxStraightPathPoints?: number;

      /**
       * Options for dtNavMeshQuery::findStraightPath
       *
       * Add a vertex at every polygon edge crossing where area changes.
       * DT_STRAIGHTPATH_AREA_CROSSINGS = 1
       *
       * Add a vertex at every polygon edge crossing.
	     * DT_STRAIGHTPATH_ALL_CROSSINGS = 2
       *
       * @default 0
       */
      straightPathOptions?: number
    }
  ) {
    const maxStraightPathPoints = options?.maxStraightPathPoints ?? 256;
    const straightPathOptions = options?.straightPathOptions ?? 0;

    const straightPath = new Arrays.FloatArray();
    straightPath.resize(maxStraightPathPoints * 3);

    const straightPathFlags = new Arrays.UnsignedCharArray();
    straightPathFlags.resize(maxStraightPathPoints);

    const straightPathRefs = new Arrays.UnsignedIntArray();
    straightPathRefs.resize(maxStraightPathPoints);

    const straightPathCount = new Raw.IntRef();

    const status = this.raw.findStraightPath(
      vec3.toArray(start),
      vec3.toArray(end),
      path,
      straightPath,
      straightPathFlags,
      straightPathRefs,
      straightPathCount,
      maxStraightPathPoints,
      straightPathOptions
    );

    return {
      success: Raw.Detour.statusSucceed(status),
      status,
      straightPath,
      straightPathFlags,
      straightPathRefs,
      straightPathCount: straightPathCount.value,
    };
  }

  /**
   * Destroys the NavMeshQuery instance
   */
  destroy(): void {
    this.raw.destroy();
  }
}
