import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
import numpy as np
import random
import cv2
import matplotlib.pyplot as plt

def draw_shape(shape, size=32):
    img = np.zeros((size, size), dtype=np.uint8)
    color = 255  # white color
    thickness = random.choice([-1, 2])  # filled or outline thickness=2

    scale = random.uniform(0.6, 1.0)
    max_dim = int(size * scale)

    max_offset = size - max_dim
    offset_x = random.randint(0, max_offset)
    offset_y = random.randint(0, max_offset)

    if shape == "circle":
        center = (offset_x + max_dim // 2, offset_y + max_dim // 2)
        radius = max_dim // 2
        cv2.circle(img, center, radius, color, thickness)

    elif shape == "square":
        pts = np.array([
            [0, 0],
            [max_dim, 0],
            [max_dim, max_dim],
            [0, max_dim]
        ], dtype=np.int32)

        angle = random.uniform(-30, 30)
        center_pt = (max_dim // 2, max_dim // 2)
        M = cv2.getRotationMatrix2D(center_pt, angle, 1.0)
        pts = np.array([np.dot(M, np.append(p, 1)) for p in pts], dtype=np.int32)

        pts += np.array([offset_x, offset_y])
        pts = pts.reshape((-1, 1, 2))

        if thickness == -1:
            cv2.fillPoly(img, [pts], color=color)
        else:
            cv2.polylines(img, [pts], isClosed=True, color=color, thickness=thickness)

    elif shape == "triangle":
        height = int(max_dim * (3 ** 0.5) / 2)
        pts = np.array([
            [max_dim // 2, 0],
            [0, height],
            [max_dim, height]
        ], dtype=np.int32)

        angle = random.uniform(-30, 30)
        center_pt = (max_dim // 2, height // 2)
        M = cv2.getRotationMatrix2D(center_pt, angle, 1.0)
        pts = np.array([np.dot(M, np.append(p, 1)) for p in pts], dtype=np.int32)

        pts += np.array([offset_x, offset_y])
        pts = pts.reshape((-1, 1, 2))

        if thickness == -1:
            cv2.fillPoly(img, [pts], color=color)
        else:
            cv2.polylines(img, [pts], isClosed=True, color=color, thickness=thickness)

    return img

class ShapeDataset(Dataset):
    def __init__(self, num_samples=3000, image_size=32):
        self.shapes = ["circle", "square", "triangle"]
        self.num_samples = num_samples
        self.image_size = image_size

    def __len__(self):
        return self.num_samples

    def __getitem__(self, idx):
        shape = random.choice(self.shapes)
        img = draw_shape(shape, size=self.image_size)
        img = img.astype(np.float32) / 255.0
        img = torch.tensor(img).unsqueeze(0)
        label = self.shapes.index(shape)
        return img, label

class ShapeCNN(nn.Module):
    def __init__(self, num_classes=3):
        super().__init__()
        self.conv1 = nn.Conv2d(1, 16, 3, padding=1)
        self.pool = nn.MaxPool2d(2, 2)
        self.conv2 = nn.Conv2d(16, 32, 3, padding=1)
        self.fc1 = nn.Linear(32 * 8 * 8, 64)
        self.fc2 = nn.Linear(64, num_classes)

    def forward(self, x):
        x = self.pool(torch.relu(self.conv1(x)))
        x = self.pool(torch.relu(self.conv2(x)))
        x = x.view(-1, 32 * 8 * 8)
        x = torch.relu(self.fc1(x))
        x = self.fc2(x)
        return x

def train(model, dataloader, device, epochs=10):
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.parameters(), lr=0.001)

    model.to(device)
    model.train()

    for epoch in range(epochs):
        running_loss = 0.0
        for imgs, labels in dataloader:
            imgs, labels = imgs.to(device), labels.to(device)

            optimizer.zero_grad()
            outputs = model(imgs)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()

            running_loss += loss.item()

        print(f"Epoch {epoch+1}/{epochs} - Loss: {running_loss / len(dataloader):.4f}")

def visualize_predictions(model, device, num_samples=5):
    model.eval()
    shapes = ["circle", "square", "triangle"]
    fig, axs = plt.subplots(1, num_samples, figsize=(num_samples * 3, 3))

    with torch.no_grad():
        for i in range(num_samples):
            shape = random.choice(shapes)
            img = draw_shape(shape, size=32)
            img_norm = img.astype(np.float32) / 255.0
            tensor_img = torch.tensor(img_norm).unsqueeze(0).unsqueeze(0).to(device)

            output = model(tensor_img)
            pred_idx = torch.argmax(output, dim=1).item()
            pred_shape = shapes[pred_idx]

            axs[i].imshow(img, cmap='gray')
            axs[i].set_title(f"True: {shape}\nPred: {pred_shape}")
            axs[i].axis('off')

    plt.show()

if __name__ == "__main__":
    dataset = ShapeDataset(num_samples=1000)
    dataloader = DataLoader(dataset, batch_size=32, shuffle=True)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = ShapeCNN(num_classes=3)

    train(model, dataloader, device)

    visualize_predictions(model, device)
