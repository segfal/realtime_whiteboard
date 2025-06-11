#include "Toolbar.h"
#include <imgui_internal.h>

namespace whiteboard {

Toolbar::Toolbar() = default;

void Toolbar::render(ToolbarState& state) {
    // Main toolbar window
    ImGui::Begin("Toolbar", nullptr, ImGuiWindowFlags_AlwaysAutoResize);
    
    renderToolButtons(state);
    ImGui::Separator();
    renderColorPickers(state);
    ImGui::Separator();
    renderExportButton();
    
    ImGui::End();
    
    // Chat window (if enabled)
    if (state.showChat) {
        renderChatWindow(state);
    }
}

void Toolbar::renderToolButtons(ToolbarState& state) {
    if (ImGui::Button("Pen", ImVec2(60, 30))) {
        state.currentTool = Tool::Pen;
        if (onToolChanged) onToolChanged(Tool::Pen);
    }
    ImGui::SameLine();
    
    if (ImGui::Button("Eraser", ImVec2(60, 30))) {
        state.currentTool = Tool::Eraser;
        if (onToolChanged) onToolChanged(Tool::Eraser);
    }
    ImGui::SameLine();
    
    if (ImGui::Button("Rectangle", ImVec2(60, 30))) {
        state.currentTool = Tool::Rectangle;
        if (onToolChanged) onToolChanged(Tool::Rectangle);
    }
    ImGui::SameLine();
    
    if (ImGui::Button("Ellipse", ImVec2(60, 30))) {
        state.currentTool = Tool::Ellipse;
        if (onToolChanged) onToolChanged(Tool::Ellipse);
    }
    ImGui::SameLine();
    
    if (ImGui::Button("Line", ImVec2(60, 30))) {
        state.currentTool = Tool::Line;
        if (onToolChanged) onToolChanged(Tool::Line);
    }
    ImGui::SameLine();
    
    if (ImGui::Button("Text", ImVec2(60, 30))) {
        state.currentTool = Tool::Text;
        if (onToolChanged) onToolChanged(Tool::Text);
    }
    ImGui::SameLine();
    
    if (ImGui::Button("Select", ImVec2(60, 30))) {
        state.currentTool = Tool::Select;
        if (onToolChanged) onToolChanged(Tool::Select);
    }
    
    // Stroke thickness slider
    ImGui::Text("Stroke Thickness");
    if (ImGui::SliderFloat("##thickness", &state.strokeThickness, 1.0f, 20.0f)) {
        if (onStrokeThicknessChanged) onStrokeThicknessChanged(state.strokeThickness);
    }
}

void Toolbar::renderColorPickers(ToolbarState& state) {
    ImGui::Text("Stroke Color");
    if (ImGui::ColorEdit4("##stroke", (float*)&state.strokeColor, 
        ImGuiColorEditFlags_NoInputs | ImGuiColorEditFlags_AlphaBar)) {
        if (onStrokeColorChanged) onStrokeColorChanged(state.strokeColor);
    }
    
    ImGui::Text("Background Color");
    if (ImGui::ColorEdit4("##background", (float*)&state.backgroundColor,
        ImGuiColorEditFlags_NoInputs | ImGuiColorEditFlags_AlphaBar)) {
        if (onBackgroundColorChanged) onBackgroundColorChanged(state.backgroundColor);
    }
}

void Toolbar::renderChatWindow(ToolbarState& state) {
    ImGui::Begin("Chat", &state.showChat, ImGuiWindowFlags_AlwaysAutoResize);
    
    // Chat history
    ImGui::BeginChild("ChatHistory", ImVec2(300, 200), true);
    for (const auto& message : state.chatHistory) {
        ImGui::TextWrapped("%s", message.c_str());
    }
    ImGui::SetScrollHereY(1.0f);
    ImGui::EndChild();
    
    // Message input
    if (ImGui::InputText("##message", &state.chatMessage, 
        ImGuiInputTextFlags_EnterReturnsTrue)) {
        if (!state.chatMessage.empty()) {
            if (onChatMessageSent) onChatMessageSent(state.chatMessage);
            state.chatMessage.clear();
        }
    }
    
    ImGui::End();
}

void Toolbar::renderExportButton() {
    if (ImGui::Button("Export", ImVec2(120, 30))) {
        if (onExportClicked) onExportClicked();
    }
}

} // namespace whiteboard
