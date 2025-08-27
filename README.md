# Eisenhower Matrix

A modern, responsive web application for organizing tasks using the Eisenhower Matrix method. Organize your tasks by urgency and importance to boost your productivity.

## Features

### 🎯 Core Functionality
- **Four Quadrants**: Organize tasks by urgency and importance
  - **Q1: Urgent & Important** - Do these tasks now
  - **Q2: Not Urgent & Important** - Schedule these tasks  
  - **Q3: Urgent & Not Important** - Delegate these tasks
  - **Q4: Not Urgent & Not Important** - Eliminate these tasks

### 🔐 Authentication
- **Magic Link Authentication**: Sign in with just your email - no passwords required
- **User Profile**: Beautiful user profile with avatar and dropdown menu
- **Welcome Screen**: Clear onboarding flow for first-time users

### 📋 Task Management
- **Add/Edit Tasks**: Create and modify tasks with titles, due dates, tags, and recurrence
- **Drag & Drop**: Move tasks between quadrants or reorder within quadrants
- **Task Completion**: Mark tasks as complete with automatic archive
- **Task Deletion**: Permanently delete tasks with confirmation
- **Task Restoration**: Restore completed tasks from archive

### 🗂️ Board Management
- **Multiple Boards**: Create and switch between different boards
- **Board Deletion**: Delete boards with confirmation (preserves other boards)
- **Board Switching**: Easy navigation between boards

### 🔍 Search & Filter
- **Global Search**: Search across all tasks and boards
- **Tag Filtering**: Filter tasks by tags
- **Archive Search**: Search through completed tasks

### 📱 Responsive Design
- **Mobile Optimized**: Works perfectly on all device sizes
- **Touch Friendly**: Optimized for touch interactions
- **Adaptive Layout**: Grid and list view modes

### 🎨 Customization
- **Theme System**: Light and dark mode support
- **Accent Colors**: Choose from blue, green, or purple themes
- **Personalization**: Customize your experience

### 📊 Archive & Analytics
- **Task Archive**: View all completed tasks
- **Archive Sorting**: Sort by date, quadrant, or title
- **Archive Filtering**: Filter archived tasks by tags

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd eisenhower-matrix
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:5173`

### First Time Setup

1. **Welcome Screen**: When you first visit the app, you'll see a beautiful welcome screen explaining the Eisenhower Matrix method
2. **Sign In**: Click "Sign In" and enter your email address
3. **Magic Link**: Check your email for a sign-in link (no password required)
4. **Start Organizing**: Begin creating tasks and organizing them into the appropriate quadrants

## Usage

### Creating Tasks
- Click the "+ Add Task" button in any quadrant
- Fill in the task details (title, due date, tags, recurrence)
- Press Enter or click "Save" to create the task

### Managing Tasks
- **Complete**: Click the checkmark to mark a task as complete
- **Edit**: Click on the task title to edit it
- **Delete**: Click the trash icon to delete a task
- **Move**: Drag and drop tasks between quadrants

### Managing Boards
- **Create Board**: Click "+ New Board" to create a new board
- **Switch Boards**: Click on board names to switch between them
- **Delete Board**: Hover over a board and click the trash icon (only available when you have multiple boards)

### User Profile
- Click on your profile avatar in the top-right corner
- View your email and sign out option
- The menu closes automatically when clicking outside

## Keyboard Shortcuts

- **A**: Quick add task to Q1 (when not typing in an input field)
- **Enter/Space**: Open keyboard move menu for tasks
- **Escape**: Cancel editing or close modals

## Technology Stack

- **Frontend**: React 18 with TypeScript
- **Styling**: CSS with CSS Variables for theming
- **Authentication**: Firebase Authentication (Magic Link)
- **Database**: Firebase Firestore
- **Build Tool**: Vite
- **Deployment**: Vercel

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

If you encounter any issues or have questions, please open an issue on GitHub.
