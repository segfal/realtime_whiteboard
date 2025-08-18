import argparse
import os
import json
import random
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
from torchvision import transforms
import matplotlib.pyplot as plt
import numpy as np
from PIL import Image, ImageDraw
import torch.nn.functional as F



# ---------------- Dataset ---------------- #
class QuickDrawDataset(Dataset):
    def __init__(self, files, label_map, img_size=64, limit_per_class=5000, transform=None):
        self.data = []
        self.labels = []
        self.label_map = label_map
        self.img_size = img_size
        self.transform = transform

        for file in files:
            # Use the shortened label by removing the "full_raw_" prefix
            label = os.path.splitext(os.path.basename(file))[0].replace("full_raw_", "")
            if label not in label_map:
                continue

            with open(file, "r") as f:
                lines = f.readlines()
                random.shuffle(lines)
                lines = lines[:limit_per_class]

                for line in lines:
                    drawing = json.loads(line)["drawing"]
                    self.data.append(drawing)
                    self.labels.append(label_map[label])

    def __len__(self):
        return len(self.data)

    def __getitem__(self, idx):
        drawing = self.data[idx]
        img = self.render_drawing(drawing)

        if self.transform:
            img = self.transform(img)

        return img, self.labels[idx]

    def render_drawing(self, drawing):
        img = Image.new("L", (self.img_size, self.img_size), 0)
        draw = ImageDraw.Draw(img)

        all_x, all_y = [], []
        for stroke in drawing:
            all_x.extend(stroke[0])
            all_y.extend(stroke[1])

        if not all_x or not all_y:
            return img

        min_x, max_x = min(all_x), max(all_x)
        min_y, max_y = min(all_y), max(all_y)

        scale = min(self.img_size / (max_x - min_x + 1),
                    self.img_size / (max_y - min_y + 1)) * 0.9
        offset_x = (self.img_size - (max_x - min_x) * scale) / 2
        offset_y = (self.img_size - (max_y - min_y) * scale) / 2

        line_width = random.randint(2, 4)

        for stroke in drawing:
            points = [(int((x - min_x) * scale + offset_x),
                         int((y - min_y) * scale + offset_y)) for x, y in zip(stroke[0], stroke[1])]
            if len(points) > 1:
                draw.line(points, fill=255, width=line_width)

        return img


# ---------------- Model ---------------- #
class SimpleCNN(nn.Module):
    def __init__(self, num_classes):
        super(SimpleCNN, self).__init__()
        self.conv = nn.Sequential(
            nn.Conv2d(1, 32, 3, padding=1), nn.ReLU(), nn.MaxPool2d(2),
            nn.Conv2d(32, 64, 3, padding=1), nn.ReLU(), nn.MaxPool2d(2),
            nn.Conv2d(64, 128, 3, padding=1), nn.ReLU(), nn.MaxPool2d(2),
        )
        self.fc = nn.Sequential(
            nn.Linear(128 * 8 * 8, 256), nn.ReLU(),
            nn.Linear(256, num_classes)
        )

    def forward(self, x):
        x = self.conv(x)
        x = x.view(x.size(0), -1)
        return self.fc(x)


# ---------------- Training ---------------- #
def train_model(model, dataloader, criterion, optimizer, device, epochs, save_every, label_map, save_path="model.pth"):
    model.train()
    for epoch in range(epochs):
        total_loss = 0
        for imgs, labels in dataloader:
            imgs, labels = imgs.to(device), labels.to(device)
            optimizer.zero_grad()
            outputs = model(imgs)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()
            total_loss += loss.item()
        print(f"Epoch [{epoch+1}/{epochs}], Loss: {total_loss/len(dataloader):.4f}")

        if (epoch + 1) % save_every == 0:
            checkpoint = {
                "model_state": model.state_dict(),
                "label_map": label_map
            }
            torch.save(checkpoint, save_path)
            print(f"Model saved at {save_path}")


# ---------------- Visualization ---------------- #
def visualize_dataset(dataset, label_map, n=25):
    indices = random.sample(range(len(dataset)), n)
    imgs, labels = zip(*[dataset[i] for i in indices])

    inv_label_map = {v: k for k, v in label_map.items()}
    imgs = [img.squeeze().numpy() for img in imgs]
    fig, axes = plt.subplots(5, 5, figsize=(8, 8))
    for ax, img, lbl in zip(axes.flatten(), imgs, labels):
        ax.imshow(img, cmap="gray")
        ax.set_title(inv_label_map[lbl])
        ax.axis("off")
    plt.show()

def visualize_prediction(img, pred, confidence, inv_label_map):
    fig, ax = plt.subplots(figsize=(4, 4))
    ax.imshow(img, cmap="gray")
    ax.set_title(f"Predicted: {inv_label_map[pred]} ({confidence.item():.2%})", fontsize=12)
    ax.axis("off")
    plt.show()


# ---------------- Prediction ---------------- #
def predict_image(model, img_path, transform, label_map, device):
    img = Image.open(img_path).convert("L").resize((64, 64))

    img_array = np.array(img)

    if img_array.mean() > 127.5:
        img_array = 255 - img_array
    
    img = Image.fromarray(img_array.astype(np.uint8))
    
    preprocessed_img = img.copy()

    img = transform(img).unsqueeze(0).to(device)

    model.eval()
    with torch.no_grad():
        outputs = model(img)
        
        probabilities = F.softmax(outputs, dim=1)
        
        confidence, pred = torch.max(probabilities, 1)

    inv_label_map = {v: k for k, v in label_map.items()}
    
    return preprocessed_img, pred.item(), confidence, inv_label_map


# ---------------- Main ---------------- #
def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--train_path", type=str, help="Path to folder with .ndjson files")
    parser.add_argument("--predict", type=str, help="Path to image for prediction")
    parser.add_argument("--epochs", type=int, default=5)
    parser.add_argument("--batch_size", type=int, default=64)
    parser.add_argument("--img_size", type=int, default=64)
    parser.add_argument("--save_every", type=int, default=5)
    parser.add_argument("--visualize", action="store_true", help="Visualize the dataset or prediction")
    parser.add_argument("--model_path", type=str, default="model.pth")
    args = parser.parse_args()

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    transform = transforms.Compose([
        transforms.ToTensor(),
        transforms.Normalize((0.5,), (0.5,))
    ])

    # ---------------- Training ---------------- #
    if args.train_path:
        files = [os.path.join(args.train_path, f) for f in os.listdir(args.train_path) if f.endswith(".ndjson")]
        # Create a shortened label map
        label_map = {os.path.splitext(os.path.basename(f))[0].replace("full_raw_", ""): i for i, f in enumerate(files)}

        dataset = QuickDrawDataset(files, label_map, img_size=args.img_size, transform=transform)
        dataloader = DataLoader(dataset, batch_size=args.batch_size, shuffle=True)

        if args.visualize:
            visualize_dataset(dataset, label_map)
            return

        # Resume if model exists
        if os.path.exists(args.model_path):
            checkpoint = torch.load(args.model_path, map_location=device)
            old_label_map = checkpoint["label_map"]
            model = SimpleCNN(num_classes=len(old_label_map)).to(device)
            model.load_state_dict(checkpoint["model_state"])
            print("Resumed training from saved model.")
        else:
            model = SimpleCNN(num_classes=len(label_map)).to(device)
            print("Training new model from scratch.")

        criterion = nn.CrossEntropyLoss()
        optimizer = optim.Adam(model.parameters(), lr=0.001)

        train_model(model, dataloader, criterion, optimizer, device, args.epochs, args.save_every, label_map, args.model_path)

    # ---------------- Prediction ---------------- #
    elif args.predict:
        if not os.path.exists(args.model_path):
            print(f"Error: Model file '{args.model_path}' not found. Please train a model first.")
            return

        checkpoint = torch.load(args.model_path, map_location=device)
        label_map = checkpoint["label_map"]

        model = SimpleCNN(num_classes=len(label_map)).to(device)
        model.load_state_dict(checkpoint["model_state"])

        preprocessed_img, pred_idx, confidence, inv_label_map = predict_image(model, args.predict, transform, label_map, device)

        print(f"Prediction: {inv_label_map[pred_idx]} | Confidence: {confidence.item():.2%}")

        if args.visualize:
            visualize_prediction(preprocessed_img, pred_idx, confidence, inv_label_map)


if __name__ == "__main__":
    main()