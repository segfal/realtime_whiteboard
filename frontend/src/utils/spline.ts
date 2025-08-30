import type { Point } from "../interfaces/canvas";

/**
 * Catmull-Rom spline interpolation utilities
 * Provides smooth curve interpolation between control points
 */

/**
 * Calculate Catmull-Rom spline point at parameter t
 * @param p0 Previous control point
 * @param p1 Current control point  
 * @param p2 Next control point
 * @param p3 Next next control point
 * @param t Parameter value (0-1)
 * @param alpha Tension parameter (0.5 for centripetal, 0 for uniform, 1 for chordal)
 * @returns Interpolated point
 */
export function catmullRomPoint(
  p0: Point,
  p1: Point,
  p2: Point,
  p3: Point,
  t: number,
  alpha: number = 0.5
): Point {
  // Catmull-Rom matrix coefficients
  const t2 = t * t;
  const t3 = t2 * t;
  
  // Catmull-Rom blending functions
  const b0 = -alpha * t3 + 2 * alpha * t2 - alpha * t;
  const b1 = (2 - alpha) * t3 + (alpha - 3) * t2 + 1;
  const b2 = (alpha - 2) * t3 + (3 - 2 * alpha) * t2 + alpha * t;
  const b3 = alpha * t3 - alpha * t2;
  
  return {
    x: b0 * p0.x + b1 * p1.x + b2 * p2.x + b3 * p3.x,
    y: b0 * p0.y + b1 * p1.y + b2 * p2.y + b3 * p3.y
  };
}

/**
 * Generate smooth spline points from control points
 * @param controlPoints Array of control points
 * @param segments Number of segments between each control point
 * @param alpha Tension parameter (0.5 for centripetal)
 * @returns Array of interpolated spline points
 */
export function generateSplinePoints(
  controlPoints: Point[],
  segments: number = 10,
  alpha: number = 0.5
): Point[] {
  if (controlPoints.length < 2) {
    return controlPoints;
  }
  
  if (controlPoints.length === 2) {
    // For 2 points, just return a straight line
    return interpolateLine(controlPoints[0], controlPoints[1], segments);
  }
  
  const splinePoints: Point[] = [];
  
  // Handle first segment (need to create virtual point)
  const firstSegment = generateSplineSegment(
    controlPoints[0],
    controlPoints[0],
    controlPoints[1],
    controlPoints[2],
    segments,
    alpha
  );
  splinePoints.push(...firstSegment);
  
  // Handle middle segments
  for (let i = 1; i < controlPoints.length - 2; i++) {
    const segment = generateSplineSegment(
      controlPoints[i - 1],
      controlPoints[i],
      controlPoints[i + 1],
      controlPoints[i + 2],
      segments,
      alpha
    );
    splinePoints.push(...segment);
  }
  
  // Handle last segment (need to create virtual point)
  const lastIndex = controlPoints.length - 1;
  const lastSegment = generateSplineSegment(
    controlPoints[lastIndex - 2],
    controlPoints[lastIndex - 1],
    controlPoints[lastIndex],
    controlPoints[lastIndex],
    segments,
    alpha
  );
  splinePoints.push(...lastSegment);
  
  return splinePoints;
}

/**
 * Generate spline points for a single segment
 * @param p0 Previous control point
 * @param p1 Current control point
 * @param p2 Next control point
 * @param p3 Next next control point
 * @param segments Number of segments
 * @param alpha Tension parameter
 * @returns Array of interpolated points for this segment
 */
function generateSplineSegment(
  p0: Point,
  p1: Point,
  p2: Point,
  p3: Point,
  segments: number,
  alpha: number
): Point[] {
  const points: Point[] = [];
  
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const point = catmullRomPoint(p0, p1, p2, p3, t, alpha);
    points.push(point);
  }
  
  return points;
}

/**
 * Simple linear interpolation between two points
 * @param p1 Start point
 * @param p2 End point
 * @param segments Number of segments
 * @returns Array of interpolated points
 */
function interpolateLine(p1: Point, p2: Point, segments: number): Point[] {
  const points: Point[] = [];
  
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    points.push({
      x: p1.x + (p2.x - p1.x) * t,
      y: p1.y + (p2.y - p1.y) * t
    });
  }
  
  return points;
}

/**
 * Calculate the length of a spline segment
 * @param controlPoints Control points for the spline
 * @param segments Number of segments to use for approximation
 * @returns Approximate length of the spline
 */
export function calculateSplineLength(
  controlPoints: Point[],
  segments: number = 20
): number {
  const splinePoints = generateSplinePoints(controlPoints, segments);
  let length = 0;
  
  for (let i = 1; i < splinePoints.length; i++) {
    const dx = splinePoints[i].x - splinePoints[i - 1].x;
    const dy = splinePoints[i].y - splinePoints[i - 1].y;
    length += Math.sqrt(dx * dx + dy * dy);
  }
  
  return length;
}

/**
 * Generate smooth spline with adaptive segment count based on curvature
 * @param controlPoints Array of control points
 * @param baseSegments Base number of segments
 * @param maxSegments Maximum segments for high curvature areas
 * @param alpha Tension parameter
 * @returns Array of interpolated spline points
 */
export function generateAdaptiveSpline(
  controlPoints: Point[],
  baseSegments: number = 10,
  maxSegments: number = 30,
  alpha: number = 0.5
): Point[] {
  if (controlPoints.length < 3) {
    return generateSplinePoints(controlPoints, baseSegments, alpha);
  }
  
  const splinePoints: Point[] = [];
  
  for (let i = 0; i < controlPoints.length - 1; i++) {
    // Calculate curvature for this segment
    const curvature = calculateCurvature(controlPoints, i);
    const segments = Math.min(
      maxSegments,
      Math.max(baseSegments, Math.floor(curvature * baseSegments))
    );
    
    // Generate points for this segment
    const p0 = i > 0 ? controlPoints[i - 1] : controlPoints[i];
    const p1 = controlPoints[i];
    const p2 = controlPoints[i + 1];
    const p3 = i < controlPoints.length - 2 ? controlPoints[i + 2] : controlPoints[i + 1];
    
    const segmentPoints = generateSplineSegment(p0, p1, p2, p3, segments, alpha);
    
    // Add points (avoid duplicates)
    if (i === 0) {
      splinePoints.push(...segmentPoints);
    } else {
      splinePoints.push(...segmentPoints.slice(1));
    }
  }
  
  return splinePoints;
}

/**
 * Calculate curvature at a control point
 * @param controlPoints Array of control points
 * @param index Index of the control point
 * @returns Curvature value (higher = more curved)
 */
function calculateCurvature(controlPoints: Point[], index: number): number {
  if (index === 0 || index >= controlPoints.length - 1) {
    return 1.0; // Default curvature for endpoints
  }
  
  const prev = controlPoints[index - 1];
  const curr = controlPoints[index];
  const next = controlPoints[index + 1];
  
  // Calculate angle between segments
  const angle1 = Math.atan2(curr.y - prev.y, curr.x - prev.x);
  const angle2 = Math.atan2(next.y - curr.y, next.x - curr.x);
  
  let angleDiff = Math.abs(angle2 - angle1);
  if (angleDiff > Math.PI) {
    angleDiff = 2 * Math.PI - angleDiff;
  }
  
  // Convert angle to curvature (0 = straight, PI = sharp turn)
  return angleDiff / Math.PI;
}
