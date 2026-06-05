# Contributing to WeatherNow

First off, thank you for considering contributing to WeatherNow! 🎉

We welcome contributions of all kinds, including bug fixes, new features, documentation improvements, UI enhancements, and performance optimizations.

## Getting Started

### 1. Fork the Repository

Click the **Fork** button at the top right of the repository page.

### 2. Clone Your Fork

```bash
git clone https://github.com/your-username/WeatherNow.git
cd WeatherNow
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Configure Environment Variables

Create a `.env` file in the project root:

```env
WEATHER_API_KEY=your_openweathermap_api_key
MONGODB_URI=your_mongodb_connection_string
```

### 5. Start Development Server

```bash
npm run dev
```

or

```bash
nodemon index.js
```

---

## Creating a Contribution

### Create a New Branch

```bash
git checkout -b feature/your-feature-name
```

### Make Your Changes

Implement your feature or bug fix.

### Commit Changes

```bash
git commit -m "Add: meaningful description of your changes"
```

### Push Changes

```bash
git push origin feature/your-feature-name
```

### Open a Pull Request

Submit a Pull Request describing:

- What you changed
- Why you changed it
- Screenshots (if applicable)

---

## Contribution Guidelines

- Follow the existing project structure.
- Keep pull requests focused on a single feature or fix.
- Use clear commit messages.
- Test your changes before submitting.
- Update documentation when necessary.
- Ensure the application runs without errors.

---

## Good First Issues

If you're new to open source, look for issues labeled:

- `good first issue`
- `beginner friendly`
- `help wanted`
- `documentation`

---

## Need Help?

Feel free to open an issue if you have questions or need guidance.

Happy Coding! 🚀