# Eisenhower Matrix SPA

A lightweight single-page application for managing tasks using the Eisenhower Matrix method.

## Features

- **Multi-board Support**: Create and switch between multiple matrix boards
- **2×2 Matrix Grid**: Four quadrants for task prioritization:
  - Urgent & Important (Do now)
  - Not Urgent & Important (Schedule)
  - Urgent & Not Important (Delegate)
  - Not Urgent & Not Important (Eliminate)
- **Task Management**: Add and edit tasks within each quadrant
- **Task Completion**: Mark tasks as complete with a single click
- **Archive System**: Completed tasks are moved to a dedicated archive view
- **Restore & Delete**: Restore completed tasks or permanently delete them
- **Drag & Drop**: Move tasks between quadrants and reorder within quadrants
- **Keyboard Accessibility**: Full keyboard support for task movement and reordering
- **Delete Functionality**: Permanently delete tasks with confirmation dialogs
- **Local Persistence**: Boards, active board selection, and all tasks persist in browser storage
- **Clean UI**: Minimal, responsive design for optimal productivity
- **Keyboard Support**: Enter to save, Escape to cancel edits

## Getting Started

### Prerequisites

- Node.js (version 16 or higher)
- npm

### Installation

1. Clone or download the project
2. Navigate to the project directory:
   ```bash
   cd eisenhower-matrix
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```
5. Open your browser and navigate to `http://localhost:5174`

## Usage

### Boards
- **Default Board**: The app starts with a "My Matrix" board
- **Create New Board**: Click the "+ New Board" button and enter a name
- **Switch Boards**: Click on any board chip to switch to that board
- **Persistence**: Your boards and active selection are automatically saved

### Tasks
- **Add Task**: Click "+ Add Task" in any quadrant, type the title, and press Enter
- **Edit Task**: Click on any task title to edit it inline
- **Complete Task**: Click the ✓ button next to any task to mark it complete
- **Delete Task**: Click the 🗑️ button next to any task to delete it permanently
- **Save Changes**: Press Enter to save, or click outside the input
- **Cancel Edit**: Press Escape to cancel editing
- **Validation**: Empty or whitespace-only titles are prevented with error messages
- **Empty States**: Quadrants show helpful hints when no tasks exist

### Delete Functionality
- **Delete Active Tasks**: Click the 🗑️ button on any active task to delete it permanently
- **Confirmation Dialog**: A confirmation dialog appears before deletion
- **Cancel Delete**: Click "Cancel" to keep the task, or "Delete" to confirm
- **No Archive**: Deleted tasks do not appear in the archive - they are permanently removed
- **Escape to Cancel**: Press Escape to dismiss the confirmation dialog

### Drag & Drop
- **Move Between Quadrants**: Drag the ⋮⋮ handle to move tasks between quadrants
- **Reorder Within Quadrant**: Drag tasks up or down within the same quadrant
- **Visual Feedback**: Quadrants highlight when dragging over them
- **Drop Indicators**: Blue lines show where the task will be placed
- **Keyboard Alternative**: Press Enter or Space on a task to open the move menu

### Keyboard Navigation
- **Move Menu**: Press Enter or Space on any task to open the move menu
- **Move to Quadrant**: Select from the "Move to" options in the menu
- **Reorder**: Use "Move Up" or "Move Down" to reorder within the current quadrant
- **Close Menu**: Press Escape or click "Close" to dismiss the menu
- **Focus Management**: Focus returns to the moved task after operations

### Archive
- **Access Archive**: Click "📁 Archive" in the header to view completed tasks
- **Archive View**: Shows all completed tasks for the active board, grouped by completion date
- **Restore Task**: Click "↶ Restore" to move a task back to its original quadrant
- **Delete Permanently**: Click "🗑️ Delete" to permanently remove a task from archive
- **Archive Confirmation**: Delete operations in archive also show confirmation dialogs
- **Back to Matrix**: Click "← Back to Matrix" to return to the main view

## Technology Stack

- **Frontend**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: CSS3 with responsive design
- **Storage**: Browser localStorage

## Development

- **Build**: `npm run build`
- **Preview**: `npm run preview`
- **Lint**: `npm run lint`

## Current Status

This is Instruction 5 implementation - delete functionality with confirmation dialogs and improved archive restore. Search/filter features will be added in subsequent instructions.

## Data Structure

### Board
```typescript
interface Board {
  id: string;
  name: string;
}
```

### Task
```typescript
interface Task {
  id: string;
  boardId: string;
  quadrantId: string; // Q1, Q2, Q3, Q4
  title: string;
  createdAt: number;
  completed: boolean;
  completedAt?: number; // Timestamp when task was completed
  order: number; // Position within quadrant for ordering
}
```

## Workflow

1. **Add Tasks**: Create tasks in the appropriate quadrants based on urgency and importance
2. **Prioritize**: Use drag-and-drop to move tasks between quadrants as priorities change
3. **Reorder**: Arrange tasks within quadrants by dragging or using keyboard controls
4. **Work on Tasks**: Focus on Q1 (Urgent & Important) tasks first
5. **Complete Tasks**: Click the ✓ button when a task is finished
6. **Delete Unnecessary**: Use the 🗑️ button to permanently remove tasks that are no longer relevant
7. **Review Archive**: Check completed tasks in the archive view
8. **Restore if Needed**: Move tasks back to quadrants if they need to be reopened
9. **Clean Up**: Permanently delete tasks from archive that are no longer needed

## Accessibility

- **Keyboard Navigation**: Full keyboard support for all operations
- **Screen Reader Support**: Proper ARIA labels and semantic HTML
- **Focus Management**: Logical focus flow and return to moved elements
- **Visual Feedback**: Clear indicators for drag operations and valid drop targets
- **Confirmation Dialogs**: Clear confirmation before destructive actions
