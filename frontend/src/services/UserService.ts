export class UserService {
  private static instance: UserService;

  private adjectives = [
    "Creative",
    "Artistic",
    "Bright",
    "Swift",
    "Clever",
    "Bold",
    "Happy",
    "Wise",
    "Cool",
    "Quick",
    "Smart",
    "Kind",
    "Neat",
    "Calm",
    "Fun",
    "Zesty",
    "Brave",
    "Gentle",
    "Sharp",
    "Sleek",
    "Vibrant",
    "Dynamic",
    "Elegant",
    "Peaceful",
  ];

  private nouns = [
    "Artist",
    "Creator",
    "Designer",
    "Painter",
    "Drawer",
    "Sketcher",
    "Doodler",
    "Illustrator",
    "Maker",
    "Builder",
    "Crafter",
    "Visionary",
    "Dreamer",
    "Explorer",
    "Pioneer",
    "Innovator",
    "Architect",
    "Engineer",
    "Thinker",
    "Planner",
    "Writer",
    "Composer",
    "Inventor",
    "Scholar",
  ];

  private constructor() {}

  public static getInstance(): UserService {
    if (!UserService.instance) {
      UserService.instance = new UserService();
    }
    return UserService.instance;
  }

  public generateDisplayName(): string {
    const adjective =
      this.adjectives[Math.floor(Math.random() * this.adjectives.length)];
    const noun = this.nouns[Math.floor(Math.random() * this.nouns.length)];
    const number = Math.floor(Math.random() * 100) + 1;

    return `${adjective} ${noun} ${number}`;
  }

  public generateUserId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `user_${random}_${timestamp}`;
  }

  public validateDisplayName(name: string): boolean {
    // Basic validation rules
    if (!name || name.trim().length === 0) return false;
    if (name.length > 30) return false;
    if (name.length < 2) return false;

    // Check for inappropriate content (basic filter)
    const inappropriate = ["admin", "moderator", "system", "bot"];
    const lowerName = name.toLowerCase();

    return !inappropriate.some((word) => lowerName.includes(word));
  }

  public sanitizeDisplayName(name: string): string {
    // Remove extra whitespace and special characters
    return name
      .trim()
      .replace(/[<>\"'&]/g, "") // Remove potentially dangerous characters
      .replace(/\s+/g, " ") // Replace multiple spaces with single space
      .substring(0, 30); // Limit length
  }

  public generateRoomName(): string {
    const themes = [
      "Brainstorm",
      "Sketch",
      "Design",
      "Create",
      "Planning",
      "Workshop",
      "Meeting",
      "Session",
      "Board",
      "Canvas",
      "Studio",
      "Lab",
    ];

    const descriptors = [
      "Creative",
      "Innovative",
      "Brilliant",
      "Dynamic",
      "Collaborative",
      "Interactive",
      "Inspiring",
      "Productive",
      "Energetic",
      "Focused",
      "Strategic",
      "Visual",
    ];

    const theme = themes[Math.floor(Math.random() * themes.length)];
    const descriptor =
      descriptors[Math.floor(Math.random() * descriptors.length)];
    const number = Math.floor(Math.random() * 1000) + 1;

    return `${descriptor} ${theme} ${number}`;
  }

  public getStoredUserData(): { displayName?: string; userId?: string } {
    try {
      const stored = localStorage.getItem("whiteboard_user");
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  }

  public storeUserData(data: { displayName?: string; userId?: string }): void {
    try {
      const existing = this.getStoredUserData();
      const updated = { ...existing, ...data };
      localStorage.setItem("whiteboard_user", JSON.stringify(updated));
    } catch (error) {
      console.warn("Failed to store user data:", error);
    }
  }

  public clearUserData(): void {
    try {
      localStorage.removeItem("whiteboard_user");
    } catch (error) {
      console.warn("Failed to clear user data:", error);
    }
  }
}
