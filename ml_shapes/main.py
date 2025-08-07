# Writing a Minimal CNN (Convolutional Neural Network) Model for Shape Recognition
# It will learn to find patters in images and combine them to recognize shapes

import torch # PyTorch Library
import torch.nn as nn # Contains neural network layers and building blocks
                      # We use 'as nn' so that in the future we can use 'nn' instead of 'torch.nn'
import torch.nn.functional as F # Contains functions for operations used in networks like activations.

class ShapeCNN(nn.Module):
    def _init_(self,num_classes=3):
        super()._init_()
        self.conv1 = nn.Conv2d(1, 16, kernel_size=3, padding=1)
        self.pool = nn.MaxPool2d(2, 2)
        self.conv2 = nn.Conv2d(16, 32, kernel_size=3, padding=1)
        self.fc1 = nn.Linear(32 * 16 * 16, 64)
        self.fc2 = nn.Linear(64, num_classes)
    
    def forward(self, x):
        x = self.pool(F.relu(self.conv1(x)))
        x = self.pool(F.relu(self.conv2(x)))
        x = x.view(-1, 32 * 16 * 16)
        x = F.relu(self.fc1(x))
        x = self.fc2(x)
        return x
