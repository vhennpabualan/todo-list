# TaskFlow - Todo List

A modern, beautiful todo-list application built with Vite, Vanilla JavaScript, and Tailwind CSS. Perfect for your portfolio!

## Features

✨ **Modern Design** - Clean, dark-themed UI inspired by professional task management apps  
📱 **Responsive** - Works seamlessly on desktop and tablets  
💾 **Data Persistence** - Tasks are saved to localStorage  
🏷️ **Project & Priority Management** - Organize tasks by project and priority level  
✓ **Task Tracking** - Mark tasks as complete and track progress  
⚡ **Lightning Fast** - Built with Vite for instant HMR and optimized builds  

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Clone or download the project
2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:5173`

## Scripts

- `npm run dev` - Start the development server
- `npm run build` - Build for production
- `npm run preview` - Preview the production build

## Project Structure

```
├── index.html          # Main HTML file
├── package.json        # Dependencies and scripts
├── vite.config.js      # Vite configuration
├── tailwind.config.js  # Tailwind CSS configuration
├── postcss.config.js   # PostCSS configuration
└── src/
    ├── style.css       # Tailwind CSS imports and custom styles
    └── main.js         # Main application logic
```

## Usage

1. **Add a Task** - Type in the input field at the bottom, select a project and priority, then click "Add"
2. **Complete a Task** - Click the checkbox to mark a task as complete
3. **Delete a Task** - Hover over a task and click the ✕ button
4. **Filter Tasks** - Use the sidebar navigation to filter by Today, Inbox, or completed tasks

## Technologies Used

- **Vite** - Next generation frontend tooling
- **Vanilla JavaScript** - Pure JS for app logic
- **Tailwind CSS** - Utility-first CSS framework
- **localStorage** - Browser storage for data persistence

## Customization

### Adding New Projects
Edit the project options in:
1. `index.html` - Project dropdown in the filter section
2. `src/main.js` - `projectLabels` object in the `renderTask` method

### Changing Colors
Modify the Tailwind color classes in:
- `index.html` - Update class names (e.g., `bg-cyan-500` to `bg-blue-500`)
- `tailwind.config.js` - Define custom colors

### Adding Features
- **Drag & Drop** - Reorder tasks by implementing sortable.js
- **Due Dates** - Add date pickers with a date library
- **Notifications** - Show alerts when tasks are due
- **Dark/Light Mode** - Toggle theme with Tailwind's `dark:` prefix

## Deployment

Deploy to services like Vercel, Netlify, or GitHub Pages:

```bash
npm run build
# The dist/ folder is ready to deploy
```

## License

This project is open source and available for your portfolio.

## Tips for Your Portfolio

- Highlight the design implementation
- Show how localStorage keeps data persistent
- Explain the Tailwind CSS styling approach
- Demonstrate the responsive design
- Consider adding your own features (drag-drop, filters, etc.)

Happy coding! 🚀
