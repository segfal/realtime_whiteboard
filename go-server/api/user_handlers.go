package api

import (
	"encoding/json"
	"net/http"
	"realtime_whiteboard/go-server/services"
)

func HandleGenerateUserID(w http.ResponseWriter, r *http.Request, userService *services.UserService) {
	userID, err := userService.GenerateUserID()
	if err != nil {
		http.Error(w, "Failed to generate user ID", http.StatusInternalServerError)
		return
	}

	response := map[string]string{
		"user_id": userID,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}
