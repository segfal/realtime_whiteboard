package services

// GoStroke defines the structure for stroke data sent from the Go backend.
type GoStroke struct {
	ID        string      `json:"id"`
	Points    [][]float64 `json:"points"`
	Color     string      `json:"color"`
	Thickness float64     `json:"thickness"`
	IsEraser  bool        `json:"isEraser"`
}
