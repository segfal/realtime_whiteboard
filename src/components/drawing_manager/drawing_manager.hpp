#ifndef __DRAWING_MANAGER__
#define __DRAWING_MANAGER__

class DrawingManager {
    public:
        DrawingManager();
        ~DrawingManager();
        void draw_line(int x1, int y1, int x2, int y2);
        void draw_circle(int x, int y, int radius);
        void draw_rectangle(int x, int y, int width, int height);
        void draw_triangle(int x1, int y1, int x2, int y2, int x3, int y3);
        void draw_polygon(int x[], int y[], int n);
        void draw_text(int x, int y, const char* text);
        void draw_image(int x, int y, const char* image);
    private:
        void draw_line_impl(int x1, int y1, int x2, int y2);
        void draw_circle_impl(int x, int y, int radius);
        void draw_rectangle_impl(int x, int y, int width, int height);
        void draw_triangle_impl(int x1, int y1, int x2, int y2, int x3, int y3);
        void draw_polygon_impl(int x[], int y[], int n);
        void draw_text_impl(int x, int y, const char* text);
        void draw_image_impl(int x, int y, const char* image);
        
};

#endif