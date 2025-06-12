#pragma once

#include <string>
#include <memory>
#include <functional>
#include <skia/core/SkSurface.h>

namespace whiteboard {

class Exporter {
public:
    Exporter();
    ~Exporter();
    
    // Export operations
    bool saveToPNG(const std::string& filename, SkSurface* surface);
    bool saveToJSON(const std::string& filename, const std::string& jsonData);
    
    // Sharing operations
    void uploadToS3(const std::string& pngPath, const std::string& jsonPath,
                   std::function<void(const std::string&)> onComplete);
    
    // Getters
    std::string getShareableLink() const { return shareableLink_; }
    
private:
    std::string shareableLink_;
    
    // AWS S3 configuration
    struct S3Config {
        std::string accessKey;
        std::string secretKey;
        std::string bucket;
        std::string region;
    } s3Config_;
    
    void loadS3Config();
    std::string generatePresignedUrl(const std::string& key);
};

} // namespace whiteboard
