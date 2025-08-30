// quickdraw.cpp
#include <torch/torch.h>
#include <opencv2/opencv.hpp>
#include <nlohmann/json.hpp>
#include <cxxopts.hpp>

#include <fstream>
#include <iostream>
#include <random>
#include <filesystem>
#include <unordered_map>

namespace fs = std::filesystem;
using json = nlohmann::json;

// ---------------- Utilities ---------------- //
static inline std::string basename_no_ext(const std::string& path) {
    auto base = fs::path(path).filename().string();
    auto dot = base.find_last_of('.');
    if (dot != std::string::npos) base = base.substr(0, dot);
    return base;
}

static inline std::string strip_full_raw_prefix(const std::string& s) {
    const std::string prefix = "full_raw_";
    if (s.rfind(prefix, 0) == 0) return s.substr(prefix.size());
    return s;
}

static inline cv::Mat render_drawing_scaled_centered(
    const json& drawing, int img_size, int line_width, double scale_margin = 0.9
) {
    cv::Mat img(img_size, img_size, CV_8UC1, cv::Scalar(0));

    // Gather all x, y
    std::vector<int> all_x, all_y;
    for (const auto& stroke : drawing) {
        const auto& xs = stroke[0];
        const auto& ys = stroke[1];
        for (size_t i = 0; i < xs.size(); ++i) {
            all_x.push_back(xs[i]);
            all_y.push_back(ys[i]);
        }
    }
    if (all_x.empty() || all_y.empty()) return img;

    int min_x = *std::min_element(all_x.begin(), all_x.end());
    int max_x = *std::max_element(all_x.begin(), all_x.end());
    int min_y = *std::min_element(all_y.begin(), all_y.end());
    int max_y = *std::max_element(all_y.begin(), all_y.end());

    double sx = img_size / (static_cast<double>(max_x - min_x) + 1.0);
    double sy = img_size / (static_cast<double>(max_y - min_y) + 1.0);
    double scale = std::min(sx, sy) * scale_margin;

    double width_scaled  = (max_x - min_x) * scale;
    double height_scaled = (max_y - min_y) * scale;

    double offset_x = (img_size - width_scaled) / 2.0;
    double offset_y = (img_size - height_scaled) / 2.0;

    for (const auto& stroke : drawing) {
        const auto& xs = stroke[0];
        const auto& ys = stroke[1];
        if (xs.size() < 2) continue;

        for (size_t i = 1; i < xs.size(); ++i) {
            cv::Point p0(
                static_cast<int>((xs[i-1] - min_x) * scale + offset_x),
                static_cast<int>((ys[i-1] - min_y) * scale + offset_y)
            );
            cv::Point p1(
                static_cast<int>((xs[i] - min_x) * scale + offset_x),
                static_cast<int>((ys[i] - min_y) * scale + offset_y)
            );
            cv::line(img, p0, p1, cv::Scalar(255), line_width, cv::LINE_AA);
        }
    }
    return img;
}

static inline torch::Tensor mat_to_chw_tensor_norm01(const cv::Mat& mat) {
    // mat is HxW (uint8, single channel)
    auto t = torch::from_blob(
        const_cast<unsigned char*>(mat.data),
        {mat.rows, mat.cols, 1},
        torch::kUInt8
    ).clone();
    t = t.permute({2, 0, 1}).to(torch::kFloat32).div(255.0); // CxHxW norm to [0,1]
    return t;
}

static inline torch::Tensor normalize_mean_std(torch::Tensor t, double mean, double std) {
    // t shape: CxHxW
    return t.sub_(mean).div_(std);
}

// ---------------- Dataset ---------------- //
struct QuickDrawDataset : public torch::data::datasets::Dataset<QuickDrawDataset> {
    struct Item {
        json drawing;
        int label;
    };

    std::vector<Item> items;
    int img_size;
    int limit_per_class;
    std::mt19937 rng;

    QuickDrawDataset(
        const std::vector<std::string>& files,
        const std::unordered_map<std::string, int>& label_map,
        int img_size_ = 64,
        int limit_per_class_ = 5000
    )
    : img_size(img_size_), limit_per_class(limit_per_class_) {
        std::random_device rd;
        rng.seed(rd());

        for (const auto& file : files) {
            std::ifstream fin(file);
            if (!fin) {
                std::cerr << "Warning: could not open " << file << "\n";
                continue;
            }
            std::vector<std::string> lines;
            std::string line;

            while (std::getline(fin, line)) {
                if (!line.empty()) lines.push_back(line);
            }
            // shuffle lines
            std::shuffle(lines.begin(), lines.end(), rng);
            if (static_cast<int>(lines.size()) > limit_per_class)
                lines.resize(limit_per_class);

            auto base = basename_no_ext(file);
            auto label_name = strip_full_raw_prefix(base);
            if (!label_map.count(label_name)) continue;
            int label = label_map.at(label_name);

            for (const auto& ln : lines) {
                json j = json::parse(ln);
                items.push_back({ j["drawing"], label });
            }
        }
    }

    torch::data::Example<> get(size_t index) override {
        const auto& it = items[index];

        // Random line width 2..4
        std::uniform_int_distribution<int> dist(2, 4);
        int lw = dist(rng);

        cv::Mat img = render_drawing_scaled_centered(it.drawing, img_size, lw);

        auto t = mat_to_chw_tensor_norm01(img);
        t = normalize_mean_std(t, 0.5, 0.5); // match Python: Normalize((0.5,), (0.5,))

        auto y = torch::tensor(it.label, torch::dtype(torch::kLong));
        return {t, y};
    }

    torch::optional<size_t> size() const override {
        return items.size();
    }
};

// ---------------- Model ---------------- //
struct SimpleCNN : torch::nn::Module {
    torch::nn::Sequential conv{nullptr}, fc{nullptr};

    explicit SimpleCNN(int num_classes) {
        conv = torch::nn::Sequential(
            torch::nn::Conv2d(torch::nn::Conv2dOptions(1, 32, 3).padding(1)),
            torch::nn::ReLU(),
            torch::nn::MaxPool2d(2),
            torch::nn::Conv2d(torch::nn::Conv2dOptions(32, 64, 3).padding(1)),
            torch::nn::ReLU(),
            torch::nn::MaxPool2d(2),
            torch::nn::Conv2d(torch::nn::Conv2dOptions(64, 128, 3).padding(1)),
            torch::nn::ReLU(),
            torch::nn::MaxPool2d(2)
        );
        fc = torch::nn::Sequential(
            torch::nn::Linear(128 * 8 * 8, 256),
            torch::nn::ReLU(),
            torch::nn::Linear(256, num_classes)
        );
        register_module("conv", conv);
        register_module("fc", fc);
    }

    torch::Tensor forward(torch::Tensor x) {
        x = conv->forward(x);
        x = x.view({x.size(0), -1});
        return fc->forward(x);
    }
};

// ---------------- Checkpoint (model + label map) ---------------- //
static inline void save_checkpoint(SimpleCNN& model,
                                   const std::string& model_path,
                                   const std::string& label_map_path,
                                   const std::unordered_map<std::string, int>& label_map) {
    // Save model
    torch::save(model, model_path);

    // Save label map as JSON
    json j;
    for (const auto& kv : label_map) j[kv.first] = kv.second;
    std::ofstream fout(label_map_path);
    fout << j.dump(2);
}

static inline std::unordered_map<std::string, int> load_label_map(const std::string& label_map_path) {
    std::unordered_map<std::string, int> lm;
    std::ifstream fin(label_map_path);
    if (!fin) {
        throw std::runtime_error("Could not open label map file: " + label_map_path);
    }
    json j; fin >> j;
    for (auto it = j.begin(); it != j.end(); ++it) {
        lm[it.key()] = it.value().get<int>();
    }
    return lm;
}

static inline std::vector<std::string> list_ndjson_files(const std::string& dir) {
    std::vector<std::string> out;
    for (const auto& entry : fs::directory_iterator(dir)) {
        if (!entry.is_regular_file()) continue;
        if (entry.path().extension() == ".ndjson") {
            out.push_back(entry.path().string());
        }
    }
    std::sort(out.begin(), out.end());
    return out;
}

// ---------------- Training ---------------- //
static inline void train_model(
    SimpleCNN& model,
    torch::data::DataLoader<torch::data::datasets::MapDataset<QuickDrawDataset, torch::data::transforms::Stack<>>> &dataloader,
    torch::Device device,
    int epochs,
    int save_every,
    const std::string& model_path,
    const std::string& label_map_path,
    const std::unordered_map<std::string,int>& label_map
) {
    model.train();
    torch::nn::CrossEntropyLoss criterion;
    torch::optim::Adam optimizer(model.parameters(), torch::optim::AdamOptions(1e-3));

    for (int epoch = 0; epoch < epochs; ++epoch) {
        double total_loss = 0.0;
        int batches = 0;

        for (auto& batch : dataloader) {
            auto imgs = batch.data.to(device);
            auto labels = batch.target.to(device);

            optimizer.zero_grad();
            auto outputs = model.forward(imgs);
            auto loss = criterion(outputs, labels);
            loss.backward();
            optimizer.step();

            total_loss += loss.item<double>();
            ++batches;
        }

        std::cout << "Epoch [" << (epoch + 1) << "/" << epochs << "], Loss: "
                  << (total_loss / std::max(1, batches)) << std::endl;

        if (((epoch + 1) % save_every) == 0) {
            save_checkpoint(model, model_path, label_map_path, label_map);
            std::cout << "Model saved at " << model_path << " and label map saved at " << label_map_path << "\n";
        }
    }
}

// ---------------- Prediction ---------------- //
static inline std::tuple<std::string, double>
predict_one(SimpleCNN& model,
            const std::string& img_path,
            const std::unordered_map<std::string,int>& label_map,
            torch::Device device) {
    // Load image as grayscale, resize to 64x64
    cv::Mat img = cv::imread(img_path, cv::IMREAD_GRAYSCALE);
    if (img.empty()) {
        throw std::runtime_error("Could not read image: " + img_path);
    }
    cv::resize(img, img, cv::Size(64, 64), 0, 0, cv::INTER_AREA);

    // Invert if background is light (match Python heuristic)
    cv::Scalar mean_scalar = cv::mean(img);
    if (mean_scalar[0] > 127.5) {
        cv::bitwise_not(img, img);
    }

    // To tensor, normalize
    auto t = mat_to_chw_tensor_norm01(img);
    t = normalize_mean_std(t, 0.5, 0.5);
    t = t.unsqueeze(0).to(device); // NCHW

    model.eval();
    torch::NoGradGuard ng;

    auto logits = model.forward(t);
    auto probs = torch::softmax(logits, 1);
    auto max_pair = probs.max(1);
    int pred_idx = std::get<1>(max_pair).item<int>();
    double conf   = std::get<0>(max_pair).item<double>();

    // invert label_map to get string
    std::string pred_label = "unknown";
    for (const auto& kv : label_map) {
        if (kv.second == pred_idx) { pred_label = kv.first; break; }
    }
    return {pred_label, conf};
}

// ---------------- main ---------------- //
int main(int argc, char** argv) {
    cxxopts::Options options("quickdraw", "QuickDraw CNN (LibTorch C++)");

    options.add_options()
        ("train_path", "Path to folder with .ndjson files", cxxopts::value<std::string>()->default_value(""))
        ("predict", "Path to image for prediction", cxxopts::value<std::string>()->default_value(""))
        ("epochs", "Number of epochs", cxxopts::value<int>()->default_value("5"))
        ("batch_size", "Batch size", cxxopts::value<int>()->default_value("64"))
        ("img_size", "Image size (square)", cxxopts::value<int>()->default_value("64"))
        ("limit_per_class", "Limit samples per class", cxxopts::value<int>()->default_value("5000"))
        ("save_every", "Save every N epochs", cxxopts::value<int>()->default_value("5"))
        ("model_path", "Path to save/load model", cxxopts::value<std::string>()->default_value("model.pt"))
        ("label_map_path", "Path to save/load label map json", cxxopts::value<std::string>()->default_value("label_map.json"))
        ("help", "Print help");

    auto args = options.parse(argc, argv);
    if (args.count("help")) {
        std::cout << options.help() << "\n";
        return 0;
    }

    std::string train_path = args["train_path"].as<std::string>();
    std::string predict_img = args["predict"].as<std::string>();
    int epochs = args["epochs"].as<int>();
    int batch_size = args["batch_size"].as<int>();
    int img_size = args["img_size"].as<int>();
    int limit_per_class = args["limit_per_class"].as<int>();
    int save_every = args["save_every"].as<int>();
    std::string model_path = args["model_path"].as<std::string>();
    std::string label_map_path = args["label_map_path"].as<std::string>();

    torch::Device device(torch::cuda::is_available() ? torch::kCUDA : torch::kCPU);
    std::cout << "Device: " << (device.is_cuda() ? "CUDA" : "CPU") << "\n";

    try {
        if (!train_path.empty()) {
            // Build label_map from files (using stripped names)
            auto files = list_ndjson_files(train_path);
            if (files.empty()) {
                std::cerr << "No .ndjson files found in: " << train_path << "\n";
                return 1;
            }
            std::unordered_map<std::string, int> label_map;
            {
                int idx = 0;
                for (const auto& f : files) {
                    auto shortname = strip_full_raw_prefix(basename_no_ext(f));
                    if (!label_map.count(shortname)) {
                        label_map[shortname] = idx++;
                    }
                }
            }

            // If a model/label map already exists, resume with old label map
            bool resume = fs::exists(model_path) && fs::exists(label_map_path);
            std::unordered_map<std::string,int> used_label_map = label_map;
            SimpleCNN* model_ptr = nullptr;

            if (resume) {
                used_label_map = load_label_map(label_map_path);
                model_ptr = new SimpleCNN(static_cast<int>(used_label_map.size()));
                torch::load(*model_ptr, model_path);
                std::cout << "Resumed training from saved model: " << model_path << "\n";
            } else {
                model_ptr = new SimpleCNN(static_cast<int>(label_map.size()));
                std::cout << "Training new model from scratch.\n";
            }
            std::unique_ptr<SimpleCNN> model(model_ptr);
            model->to(device);

            QuickDrawDataset dataset(files, used_label_map, img_size, limit_per_class);
            auto dl = torch::data::make_data_loader(
                dataset.map(torch::data::transforms::Stack<>()),
                torch::data::DataLoaderOptions().batch_size(batch_size).workers(2).shuffle(true)
            );

            train_model(*model, *dl, device, epochs, save_every, model_path, label_map_path, used_label_map);

            // Final save
            save_checkpoint(*model, model_path, label_map_path, used_label_map);
            std::cout << "Final model saved.\n";
        }
        else if (!predict_img.empty()) {
            if (!fs::exists(model_path) || !fs::exists(label_map_path)) {
                std::cerr << "Error: model or label map not found. Please train first.\n";
                return 1;
            }
            auto label_map = load_label_map(label_map_path);
            SimpleCNN model(static_cast<int>(label_map.size()));
            torch::load(model, model_path);
            model.to(device);

            auto [pred_label, conf] = predict_one(model, predict_img, label_map, device);
            std::cout << "Prediction: " << pred_label << " | Confidence: " << std::fixed << std::setprecision(2)
                      << (conf * 100.0) << "%\n";
        }
        else {
            std::cout << "Nothing to do. Provide --train_path or --predict. Use --help for options.\n";
        }
    } catch (const std::exception& ex) {
        std::cerr << "Exception: " << ex.what() << "\n";
        return 1;
    }

    return 0;
}
