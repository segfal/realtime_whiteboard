export interface Point {
    x: number;
    y: number;
}

export interface Stroke {
    points: Point[];
    color: string;
    thickness: number;
}

export interface SelectionBounds {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
} 