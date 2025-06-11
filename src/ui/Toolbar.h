#pragma once

#include <string>
#include <functional>
#include <imgui.h>

namespace whiteboard {

enum class Tool {
    Pen,
    Eraser,
    Rectangle,
    Ellipse,
    Line,
    Text,
    Select
};

struct ToolbarState {
    Tool currentTool = Tool::Pen;
    float strokeThickness = 2.0f;
    ImVec4 strokeColor = ImVec4(0.0f, 0.0f, 0.0f, 1.0f);
    ImVec4 backgroundColor = ImVec4(1.0f, 1.0f, 1.0f, 1.0f);
    bool showChat = true;
    std::string chatMessage;
    std::vector<std::string> chatHistory;
};

class Toolbar {
public:
    Toolbar();
    
    void render(ToolbarState& state);
    
    // Callbacks
    std::function<void(Tool)> onToolChanged;
    std::function<void(float)> onStrokeThicknessChanged;
    std::function<void(ImVec4)> onStrokeColorChanged;
    std::function<void(ImVec4)> onBackgroundColorChanged;
    std::function<void(const std::string&)> onChatMessageSent;
    std::function<void()> onExportClicked;
    
private:
    void renderToolButtons(ToolbarState& state);
    void renderColorPickers(ToolbarState& state);
    void renderChatWindow(ToolbarState& state);
    void renderExportButton();
};

} // namespace whiteboard 