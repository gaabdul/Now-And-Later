import { useState, useEffect, useRef } from 'react'
import './App.css'
import { AuthButton } from './components/AuthUI'
import { useAuth } from './contexts/AuthContext'

interface Board {
  id: string;
  name: string;
}

interface Task {
  id: string;
  boardId: string;
  quadrantId: string;
  title: string;
  createdAt: number;
  completed: boolean;
  completedAt?: number;
  order: number;
  dueDate?: string | null;
  reminderAt?: string | null;
  tags: string[];
  recurrence: 'none' | 'daily' | 'weekly' | 'monthly';
}

interface TaskFormData {
  title: string;
  dueDate: string;
  reminderAt?: string;
  tags: string;
  recurrence: 'none' | 'daily' | 'weekly' | 'monthly';
}

interface SearchResult {
  task: Task;
  boardName: string;
  quadrantName: string;
  isArchived: boolean;
}

type ArchiveSortType = 'date' | 'quadrant' | 'title';
type ViewMode = 'grid' | 'list';
type ThemeMode = 'light' | 'dark';
type AccentColor = 'blue' | 'green' | 'purple';

interface Theme {
  mode: ThemeMode;
  accent: AccentColor;
}

function App() {
  const { user, loading, isGuest } = useAuth();
  const [boards, setBoards] = useState<Board[]>([]);
  const [activeBoardId, setActiveBoardId] = useState<string>('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [newTaskInputs, setNewTaskInputs] = useState<{ [key: string]: TaskFormData }>({});
  const [errorMessages, setErrorMessages] = useState<{ [key: string]: string }>({});
  const [showArchive, setShowArchive] = useState(false);
  const [dragState, setDragState] = useState<{
    taskId: string | null;
    sourceQuadrant: string | null;
    isDragging: boolean;
  }>({
    taskId: null,
    sourceQuadrant: null,
    isDragging: false
  });
  const [keyboardMoveState, setKeyboardMoveState] = useState<{
    taskId: string | null;
    isOpen: boolean;
  }>({
    taskId: null,
    isOpen: false
  });
  const [dragOverQuadrant, setDragOverQuadrant] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [deleteConfirmTaskId, setDeleteConfirmTaskId] = useState<string | null>(null);
  const [deleteConfirmBoardId, setDeleteConfirmBoardId] = useState<string | null>(null);
  const [activeTagFilter, setActiveTagFilter] = useState<string | null>(null);
  const [showTaskForm, setShowTaskForm] = useState<string | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  
  // Archive state
  const [archiveSortType, setArchiveSortType] = useState<ArchiveSortType>('date');
  const [archiveTagFilter, setArchiveTagFilter] = useState<string | null>(null);
  
  // Mobile state
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  
  // Theme state
  const [theme, setTheme] = useState<Theme>({ mode: 'light', accent: 'blue' });
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchResultsRef = useRef<HTMLDivElement>(null);

  const quadrants = [
    { id: 'Q1', name: 'Urgent & Important', action: 'Do now' },
    { id: 'Q2', name: 'Not Urgent & Important', action: 'Schedule' },
    { id: 'Q3', name: 'Urgent & Not Important', action: 'Delegate' },
    { id: 'Q4', name: 'Not Urgent & Not Important', action: 'Eliminate' }
  ];

  // Load boards, active board, tasks, and theme from localStorage on component mount
  useEffect(() => {
    const savedBoards = localStorage.getItem('eisenhower-boards');
    const savedActiveBoard = localStorage.getItem('eisenhower-active-board');
    const savedTasks = localStorage.getItem('eisenhower-tasks');
    const savedArchiveSort = localStorage.getItem('eisenhower-archive-sort');
    const savedArchiveTagFilter = localStorage.getItem('eisenhower-archive-tag-filter');
    const savedViewMode = localStorage.getItem('eisenhower-view-mode');
    const savedTheme = localStorage.getItem('eisenhower-theme');
    
    if (savedBoards) {
      const parsedBoards = JSON.parse(savedBoards);
      setBoards(parsedBoards);
      
      if (savedActiveBoard && parsedBoards.find((b: Board) => b.id === savedActiveBoard)) {
        setActiveBoardId(savedActiveBoard);
      } else if (parsedBoards.length > 0) {
        setActiveBoardId(parsedBoards[0].id);
      }
    } else {
      // Create default board if no boards exist
      const defaultBoard: Board = { id: '1', name: 'My Matrix' };
      setBoards([defaultBoard]);
      setActiveBoardId(defaultBoard.id);
    }

    if (savedTasks) {
      try {
        const parsedTasks = JSON.parse(savedTasks);
        // Ensure all tasks have required fields
        const tasksWithDefaults = parsedTasks.map((task: Task, index: number) => ({
          ...task,
          order: task.order || index,
          tags: task.tags || [],
          dueDate: task.dueDate || null,
          reminderAt: task.reminderAt || null,
          recurrence: task.recurrence || 'none'
        }));
        setTasks(tasksWithDefaults);
      } catch (error) {
        console.warn('Failed to parse saved tasks, starting with empty tasks');
        setTasks([]);
      }
    }

    if (savedArchiveSort) {
      setArchiveSortType(savedArchiveSort as ArchiveSortType);
    }
    if (savedArchiveTagFilter) {
      setArchiveTagFilter(savedArchiveTagFilter);
    }
    if (savedViewMode) {
      setViewMode(savedViewMode as ViewMode);
    }
    
    if (savedTheme) {
      try {
        const parsedTheme = JSON.parse(savedTheme);
        setTheme(parsedTheme);
      } catch (error) {
        console.warn('Failed to parse saved theme, using default');
      }
    }
  }, []);

  // Save boards, active board, and tasks to localStorage whenever they change
  useEffect(() => {
    if (boards.length > 0) {
      try {
        localStorage.setItem('eisenhower-boards', JSON.stringify(boards));
        localStorage.setItem('eisenhower-active-board', activeBoardId);
      } catch (error) {
        console.warn('Failed to save boards to localStorage:', error);
      }
    }
  }, [boards, activeBoardId]);

  useEffect(() => {
    try {
      localStorage.setItem('eisenhower-tasks', JSON.stringify(tasks));
    } catch (error) {
      console.warn('Failed to save tasks to localStorage:', error);
    }
  }, [tasks]);

  // Save archive preferences and theme
  useEffect(() => {
    try {
      localStorage.setItem('eisenhower-archive-sort', archiveSortType);
      localStorage.setItem('eisenhower-archive-tag-filter', archiveTagFilter || '');
      localStorage.setItem('eisenhower-view-mode', viewMode);
      localStorage.setItem('eisenhower-theme', JSON.stringify(theme));
    } catch (error) {
      console.warn('Failed to save preferences to localStorage:', error);
    }
  }, [archiveSortType, archiveTagFilter, viewMode, theme]);

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
      if (Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
          setNotificationPermission(permission);
        });
      }
    }
  }, []);

  // Check for due reminders
  useEffect(() => {
    const checkReminders = () => {
      const now = new Date();
      tasks.forEach(task => {
        if (task.reminderAt && !task.completed) {
          const reminderTime = new Date(task.reminderAt);
          if (reminderTime <= now && reminderTime > new Date(now.getTime() - 60000)) { // Within last minute
            showNotification(task);
          }
        }
      });
    };

    const interval = setInterval(checkReminders, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [tasks, notificationPermission]);

  // Search functionality
  useEffect(() => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const results: SearchResult[] = [];
      
      tasks.forEach(task => {
        const matchesTitle = task.title.toLowerCase().includes(query);
        const matchesTags = task.tags.some(tag => tag.toLowerCase().includes(query));
        
        if (matchesTitle || matchesTags) {
          const board = boards.find(b => b.id === task.boardId);
          const quadrant = quadrants.find(q => q.id === task.quadrantId);
          results.push({
            task,
            boardName: board?.name || 'Unknown Board',
            quadrantName: quadrant?.name || task.quadrantId,
            isArchived: task.completed
          });
        }
      });
      
      setSearchResults(results);
      setShowSearchResults(true);
    } else {
      setSearchResults([]);
      setShowSearchResults(false);
    }
  }, [searchQuery, tasks, boards]);

  // Click outside search results to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchResultsRef.current && !searchResultsRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const showNotification = (task: Task) => {
    if (notificationPermission === 'granted') {
      const board = boards.find(b => b.id === task.boardId);
      const quadrant = quadrants.find(q => q.id === task.quadrantId);
      
      new Notification('Task Reminder', {
        body: `${task.title}\nBoard: ${board?.name || 'Unknown'}\nQuadrant: ${quadrant?.name || task.quadrantId}`,
        icon: '/favicon.ico',
        tag: task.id,
        requireInteraction: true
      });
    }
  };

  const createNewBoard = async () => {
    const boardName = prompt('Enter board name:');
    if (boardName && boardName.trim()) {
      const newBoard: Board = {
        id: (boards.length + 1).toString(),
        name: boardName.trim()
      };
      setBoards(prev => [...prev, newBoard]);
      setActiveBoardId(newBoard.id);
    }
  };

  const getTasksForQuadrant = (quadrantId: string) => {
    return tasks
      .filter(task => task.boardId === activeBoardId && task.quadrantId === quadrantId && !task.completed)
      .sort((a, b) => a.order - b.order);
  };

  const getCompletedTasks = () => {
    return tasks
      .filter(task => task.boardId === activeBoardId && task.completed)
      .sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0));
  };



  const addTask = async (quadrantId: string) => {
    const formData = newTaskInputs[quadrantId];
    if (!formData || !formData.title.trim()) return;

    const tags = formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
    
    try {
      const newTask: Task = {
        id: Date.now().toString(), // Simple ID generation
        boardId: activeBoardId,
        quadrantId,
        title: formData.title.trim(),
        createdAt: Date.now(),
        completed: false,
        order: getTasksForQuadrant(quadrantId).length,
        dueDate: formData.dueDate || null,
        reminderAt: formData.reminderAt || null,
        tags,
        recurrence: formData.recurrence || 'none'
      };
      setTasks(prev => [...prev, newTask]);

      // Clear the form
      const { [quadrantId]: removed, ...rest } = newTaskInputs;
      setNewTaskInputs(rest);
      setShowTaskForm(null);
    } catch (error) {
      console.error('Error creating task:', error);
      alert('Failed to create task. Please try again.');
    }
  };

  const updateTask = async (taskId: string, formData: TaskFormData) => {
    const taskIndex = tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) return;

    const tags = formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
    
    try {
      const updatedTask = {
        ...tasks[taskIndex],
        title: formData.title.trim(),
        dueDate: formData.dueDate || null,
        reminderAt: formData.reminderAt || null,
        tags,
        recurrence: formData.recurrence || 'none'
      };
      setTasks(prev => prev.map((t, index) => (index === taskIndex ? updatedTask : t)));

      setEditingTaskId(null);
    } catch (error) {
      console.error('Error updating task:', error);
      alert('Failed to update task. Please try again.');
    }
  };

  const completeTask = async (taskId: string) => {
    const taskIndex = tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) return;

    try {
      const updatedTask = {
        ...tasks[taskIndex],
        completed: true,
        completedAt: Date.now()
      };
      setTasks(prev => prev.map((t, index) => (index === taskIndex ? updatedTask : t)));

      // Handle recurrence
      if (tasks[taskIndex].recurrence !== 'none' && tasks[taskIndex].dueDate) {
        const currentDueDate = new Date(tasks[taskIndex].dueDate);
        let nextDueDate = new Date(currentDueDate);
        
        switch (tasks[taskIndex].recurrence) {
          case 'daily':
            nextDueDate.setDate(currentDueDate.getDate() + 1);
            break;
          case 'weekly':
            nextDueDate.setDate(currentDueDate.getDate() + 7);
            break;
          case 'monthly':
            nextDueDate.setMonth(currentDueDate.getMonth() + 1);
            break;
        }

        const nextTask: Task = {
          id: Date.now().toString(), // Simple ID generation
          boardId: tasks[taskIndex].boardId,
          quadrantId: tasks[taskIndex].quadrantId,
          title: tasks[taskIndex].title,
          createdAt: Date.now(),
          completed: false,
          order: getTasksForQuadrant(tasks[taskIndex].quadrantId).length,
          dueDate: nextDueDate.toISOString().split('T')[0],
          reminderAt: tasks[taskIndex].reminderAt,
          tags: tasks[taskIndex].tags,
          recurrence: tasks[taskIndex].recurrence,
        };

        setTasks(prev => [...prev, nextTask]);
      }
    } catch (error) {
      console.error('Error completing task:', error);
      alert('Failed to complete task. Please try again.');
    }
  };

  const deleteTask = async (taskId: string) => {
    const taskIndex = tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) return;

    try {
      setTasks(prev => prev.filter((_, index) => index !== taskIndex));
      setDeleteConfirmTaskId(null);
    } catch (error) {
      console.error('Error deleting task:', error);
      alert('Failed to delete task. Please try again.');
    }
  };

  const restoreTask = async (taskId: string) => {
    const taskIndex = tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) return;

    try {
      const updatedTask = {
        ...tasks[taskIndex],
        completed: false,
        completedAt: undefined
      };
      setTasks(prev => prev.map((t, index) => (index === taskIndex ? updatedTask : t)));
    } catch (error) {
      console.error('Error restoring task:', error);
      alert('Failed to restore task. Please try again.');
    }
  };

  const deleteBoard = async (boardId: string) => {
    try {
      // Delete all tasks associated with this board
      const updatedTasks = tasks.filter(task => task.boardId !== boardId);
      setTasks(updatedTasks);
      
      // Remove the board
      const updatedBoards = boards.filter(board => board.id !== boardId);
      setBoards(updatedBoards);
      
      // If the deleted board was active, switch to the first available board
      if (activeBoardId === boardId) {
        if (updatedBoards.length > 0) {
          setActiveBoardId(updatedBoards[0].id);
        } else {
          // Create a new default board if no boards remain
          const defaultBoard: Board = { id: '1', name: 'My Matrix' };
          setBoards([defaultBoard]);
          setActiveBoardId(defaultBoard.id);
        }
      }
      
      setDeleteConfirmBoardId(null);
    } catch (error) {
      console.error('Error deleting board:', error);
      alert('Failed to delete board. Please try again.');
    }
  };

  // Helper functions
  const getAllTags = () => {
    const allTags = new Set<string>();
    tasks.forEach(task => {
      task.tags.forEach(tag => allTags.add(tag));
    });
    return Array.from(allTags).sort();
  };

  const getArchiveTags = () => {
    const archiveTags = new Set<string>();
    getCompletedTasks().forEach(task => {
      task.tags.forEach(tag => archiveTags.add(tag));
    });
    return Array.from(archiveTags).sort();
  };

  const formatDueDate = (dueDate: string | null) => {
    if (!dueDate) return '';
    const date = new Date(dueDate);
    return date.toLocaleDateString();
  };

  const getThemeClass = () => {
    return `theme-${theme.mode} accent-${theme.accent}`;
  };

  const toggleTheme = () => {
    setTheme(prev => ({
      ...prev,
      mode: prev.mode === 'light' ? 'dark' : 'light'
    }));
  };

  const setAccentColor = (accent: AccentColor) => {
    setTheme(prev => ({
      ...prev,
      accent
    }));
  };

  const handleSearchResultClick = (result: SearchResult) => {
    // Scroll to the task in the UI
    const taskElement = document.querySelector(`[data-task-id="${result.task.id}"]`);
    if (taskElement) {
      taskElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Highlight the task briefly
      taskElement.classList.add('highlight');
      setTimeout(() => taskElement.classList.remove('highlight'), 2000);
    }
    setShowSearchResults(false);
    setSearchQuery('');
  };

  const isOverdue = (dueDate: string | null | undefined) => {
    if (!dueDate) return false;
    const today = new Date();
    const due = new Date(dueDate);
    return due < today && due.toDateString() !== today.toDateString();
  };

  const getNextOrder = (quadrantId: string) => {
    const quadrantTasks = getTasksForQuadrant(quadrantId);
    return quadrantTasks.length;
  };

  // Drag and Drop Functions
  const handleDragStart = (e: React.DragEvent, taskId: string, quadrantId: string) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', taskId);
    setDragState({
      taskId,
      sourceQuadrant: quadrantId,
      isDragging: true
    });
    
    // Add dragging class to the dragged element
    const target = e.target as HTMLElement;
    const taskItem = target.closest('.task-item');
    if (taskItem) {
      taskItem.classList.add('dragging');
    }
  };

  const handleDragOver = (e: React.DragEvent, quadrantId: string, index?: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverQuadrant(quadrantId);
    setDragOverIndex(index !== undefined ? index : null);
  };

  const handleDragLeave = () => {
    setDragOverQuadrant(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    // Remove dragging class from all task items
    document.querySelectorAll('.task-item').forEach(item => {
      item.classList.remove('dragging');
    });
    
    setDragState({ taskId: null, sourceQuadrant: null, isDragging: false });
    setDragOverQuadrant(null);
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, targetQuadrantId: string, targetIndex?: number) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    
    if (!taskId || !dragState.taskId) return;

    const taskIndex = tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) return;

    const targetQuadrantTasks = getTasksForQuadrant(targetQuadrantId);
    
    let newOrder: number;
    
    if (targetIndex !== undefined) {
      // Insert at specific position
      if (targetIndex >= targetQuadrantTasks.length) {
        newOrder = getNextOrder(targetQuadrantId);
      } else {
        const targetTask = targetQuadrantTasks[targetIndex];
        newOrder = targetTask.order;
      }
    } else {
      // Add to end
      newOrder = getNextOrder(targetQuadrantId);
    }

    // Reorder tasks in target quadrant
    const updatedTasks = tasks.map(t => {
      if (t.id === taskId) {
        return { ...t, quadrantId: targetQuadrantId, order: newOrder };
      }
      if (t.quadrantId === targetQuadrantId && !t.completed && t.boardId === activeBoardId) {
        if (targetIndex !== undefined && t.order >= newOrder) {
          return { ...t, order: t.order + 1 };
        }
      }
      return t;
    });

    // Reorder tasks in source quadrant
    // Update task orders for the source quadrant
    updatedTasks.forEach(t => {
      if (t.quadrantId === dragState.sourceQuadrant && !t.completed && t.boardId === activeBoardId) {
        const sourceTasks = updatedTasks.filter(task => 
          task.quadrantId === dragState.sourceQuadrant && 
          !task.completed && 
          task.boardId === activeBoardId &&
          task.id !== taskId
        ).sort((a, b) => a.order - b.order);
        
        const sourceIndex = sourceTasks.findIndex(task => task.id === t.id);
        if (sourceIndex !== -1) {
          // Update task order using the context
          // This part needs to be handled by the backend or a state management solution
          // For now, we'll just re-fetch or update the specific task order
          console.warn("Reordering tasks directly in localStorage is not fully supported. Consider backend.");
          // setTasks(prev => prev.map(task => task.id === t.id ? { ...task, order: sourceIndex } : task));
        }
      }
    });
    setDragState({ taskId: null, sourceQuadrant: null, isDragging: false });
    setDragOverQuadrant(null);
    setDragOverIndex(null);
  };

  // Keyboard Move Functions
  const handleKeyboardMove = (taskId: string, _targetQuadrantId: string, direction?: 'up' | 'down') => {
    const taskIndex = tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) return;

    if (direction) {
      // Move up/down within same quadrant
      const quadrantTasks = getTasksForQuadrant(tasks[taskIndex].quadrantId);
      const currentIndex = quadrantTasks.findIndex(t => t.id === taskId);
      const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      
      if (targetIndex >= 0 && targetIndex < quadrantTasks.length) {
        // This part needs to be handled by the backend or a state management solution
        // For now, we'll just re-fetch or update the specific task order
        console.warn("Reordering tasks directly in localStorage is not fully supported. Consider backend.");
      }
          } else {
        // Move to different quadrant
        // This part needs to be handled by the backend or a state management solution
        // For now, we'll just re-fetch or update the specific task quadrant and order
        console.warn("Moving tasks directly in localStorage is not fully supported. Consider backend.");
      }
    
    setKeyboardMoveState({ taskId: null, isOpen: false });
  };

  const cancelEdit = () => {
    setEditingTaskId(null);
    setErrorMessages({});
    setShowTaskForm(null);
  };



  // Global keyboard event handler for A key
  useEffect(() => {
    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      // Only handle A key when not typing in an input field
      if (event.key === 'a' || event.key === 'A') {
        const target = event.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true') {
          return;
        }
        
        event.preventDefault();
        
        // Find the first quadrant and open add task form
        if (!showArchive && !showTaskForm) {
          setShowTaskForm('Q1');
          setNewTaskInputs(prev => ({ 
            ...prev, 
            'Q1': { title: '', dueDate: '', reminderAt: '', tags: '', recurrence: 'none' } 
          }));
        }
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, [showArchive, showTaskForm]);

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getQuadrantName = (quadrantId: string) => {
    const quadrant = quadrants.find(q => q.id === quadrantId);
    return quadrant ? quadrant.name : quadrantId;
  };

  const activeBoard = boards.find(board => board.id === activeBoardId);
  const completedTasks = getCompletedTasks();
  const allTags = getAllTags();
  const archiveTags = getArchiveTags();

  // Group completed tasks by date
  const groupedCompletedTasks = completedTasks.reduce((groups, task) => {
    const date = new Date(task.completedAt || 0).toLocaleDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(task);
    return groups;
  }, {} as { [key: string]: Task[] });

  // Show login flow for first-time users
  if (loading) {
    return (
      <div className="app loading-screen">
        <div className="loading-content">
          <h1>Eisenhower Matrix</h1>
          <div className="loading-spinner"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // Show login flow for guests
  if (isGuest) {
    return (
      <div className="app welcome-screen">
        <div className="welcome-content">
          <h1>Welcome to Eisenhower Matrix</h1>
          <p className="welcome-subtitle">
            Organize your tasks by urgency and importance to boost your productivity
          </p>
          
          <div className="welcome-features">
            <div className="feature">
              <div className="feature-icon">⚡</div>
              <h3>Urgent & Important</h3>
              <p>Do these tasks now</p>
            </div>
            <div className="feature">
              <div className="feature-icon">📅</div>
              <h3>Not Urgent & Important</h3>
              <p>Schedule these tasks</p>
            </div>
            <div className="feature">
              <div className="feature-icon">👥</div>
              <h3>Urgent & Not Important</h3>
              <p>Delegate these tasks</p>
            </div>
            <div className="feature">
              <div className="feature-icon">❌</div>
              <h3>Not Urgent & Not Important</h3>
              <p>Eliminate these tasks</p>
            </div>
          </div>
          
          <div className="auth-section">
            <h2>Get Started</h2>
            <p>Sign in with your email to start organizing your tasks</p>
            <AuthButton />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`app ${getThemeClass()}`}>
      <header className="header">
        <h1>Eisenhower Matrix</h1>
        
        {/* Desktop Header Controls */}
        <div className="header-controls desktop-only">
          <div className="search-container">
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            {showSearchResults && searchResults.length > 0 && (
              <div ref={searchResultsRef} className="search-results">
                {searchResults.map((result) => (
                  <div
                    key={result.task.id}
                    className="search-result"
                    onClick={() => handleSearchResultClick(result)}
                  >
                    <div className="search-result-title">{result.task.title}</div>
                    <div className="search-result-meta">
                      <span className="search-result-board">{result.boardName}</span>
                      <span className="search-result-location">
                        {result.isArchived ? 'Archive' : result.quadrantName}
                      </span>
                      {result.task.dueDate && (
                        <span className="search-result-due">
                          📅 {formatDueDate(result.task.dueDate)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {allTags.length > 0 && (
            <div className="tag-filter">
              <select 
                value={activeTagFilter || ''} 
                onChange={(e) => setActiveTagFilter(e.target.value || null)}
                className="tag-filter-select"
              >
                <option value="">All Tags</option>
                {allTags.map(tag => (
                  <option key={tag} value={tag}>{tag}</option>
                ))}
              </select>
            </div>
          )}
          
          <button 
            className={`archive-btn ${showArchive ? 'active' : ''}`}
            onClick={() => setShowArchive(!showArchive)}
          >
            {showArchive ? '← Back to Matrix' : '📁 Archive'}
          </button>
          
          <div className="theme-controls">
            <button 
              className="theme-toggle-btn"
              onClick={() => setShowThemeMenu(!showThemeMenu)}
              title="Theme Settings"
            >
              {theme.mode === 'light' ? '☀️' : '🌙'}
            </button>
            
            {showThemeMenu && (
              <div className="theme-menu">
                <div className="theme-mode">
                  <label>Theme:</label>
                  <button 
                    className={`theme-mode-btn ${theme.mode === 'light' ? 'active' : ''}`}
                    onClick={() => toggleTheme()}
                  >
                    ☀️ Light
                  </button>
                  <button 
                    className={`theme-mode-btn ${theme.mode === 'dark' ? 'active' : ''}`}
                    onClick={() => toggleTheme()}
                  >
                    🌙 Dark
                  </button>
                </div>
                <div className="theme-accent">
                  <label>Accent:</label>
                  <button 
                    className={`accent-btn ${theme.accent === 'blue' ? 'active' : ''}`}
                    onClick={() => setAccentColor('blue')}
                  >
                    Blue
                  </button>
                  <button 
                    className={`accent-btn ${theme.accent === 'green' ? 'active' : ''}`}
                    onClick={() => setAccentColor('green')}
                  >
                    Green
                  </button>
                  <button 
                    className={`accent-btn ${theme.accent === 'purple' ? 'active' : ''}`}
                    onClick={() => setAccentColor('purple')}
                  >
                    Purple
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* User Profile Section */}
          <div className="user-profile">
            <AuthButton />
          </div>
        </div>

        {/* Mobile Header Controls */}
        <div className="header-controls mobile-only">
          <button 
            className="mobile-menu-btn"
            onClick={() => setShowMobileMenu(!showMobileMenu)}
          >
            ☰
          </button>
          
          {showMobileMenu && (
            <div className="mobile-menu">
              <div className="mobile-search">
                <input
                  type="text"
                  placeholder="Search tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="mobile-search-input"
                />
              </div>
              
              {allTags.length > 0 && (
                <div className="mobile-tag-filter">
                  <select 
                    value={activeTagFilter || ''} 
                    onChange={(e) => setActiveTagFilter(e.target.value || null)}
                    className="mobile-tag-filter-select"
                  >
                    <option value="">All Tags</option>
                    {allTags.map(tag => (
                      <option key={tag} value={tag}>{tag}</option>
                    ))}
                  </select>
                </div>
              )}
              
              <button 
                className={`mobile-archive-btn ${showArchive ? 'active' : ''}`}
                onClick={() => {
                  setShowArchive(!showArchive);
                  setShowMobileMenu(false);
                }}
              >
                {showArchive ? '← Back to Matrix' : '📁 Archive'}
              </button>
              
              <button 
                className="mobile-view-toggle"
                onClick={() => {
                  setViewMode(viewMode === 'grid' ? 'list' : 'grid');
                  setShowMobileMenu(false);
                }}
              >
                {viewMode === 'grid' ? '📋 List' : '🔲 Grid'}
              </button>

              {/* Mobile User Profile */}
              <div className="mobile-user-profile">
                <AuthButton />
              </div>
            </div>
          )}
        </div>
      </header>
      
      {!showArchive && (
        <>
          <div className="board-switcher">
            <div className="board-list">
              {boards.map(board => (
                <div key={board.id} className="board-chip-container">
                  <button
                    className={`board-chip ${board.id === activeBoardId ? 'active' : ''}`}
                    onClick={() => setActiveBoardId(board.id)}
                  >
                    {board.name}
                  </button>
                  {boards.length > 1 && (
                    <button
                      className="board-delete-btn"
                      onClick={() => setDeleteConfirmBoardId(board.id)}
                      title="Delete board"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button className="new-board-btn" onClick={createNewBoard}>
              + New Board
            </button>
          </div>

          {/* Board Delete Confirmation */}
          {deleteConfirmBoardId && (
            <div className="delete-board-modal">
              <div className="delete-board-content">
                <h3>Delete Board</h3>
                <p>
                  Are you sure you want to delete "{boards.find(b => b.id === deleteConfirmBoardId)?.name}"? 
                  This will permanently delete all tasks in this board.
                </p>
                <div className="delete-board-actions">
                  <button 
                    className="confirm-delete-btn"
                    onClick={() => deleteBoard(deleteConfirmBoardId)}
                  >
                    Delete Board
                  </button>
                  <button 
                    className="cancel-delete-btn"
                    onClick={() => setDeleteConfirmBoardId(null)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          <main className={`matrix-container ${viewMode === 'list' ? 'list-mode' : ''}`}>
            <div className={`matrix ${viewMode === 'list' ? 'list-layout' : 'grid-layout'}`}>
              {quadrants.map(quadrant => {
                const quadrantTasks = getTasksForQuadrant(quadrant.id);
                const isAddingTask = showTaskForm === quadrant.id;
                const isDragOver = dragOverQuadrant === quadrant.id;
                
                return (
                  <div 
                    key={quadrant.id} 
                    className={`quadrant ${quadrant.id.toLowerCase().replace(/\s+/g, '-')} ${isDragOver ? 'drag-over' : ''}`}
                    onDragOver={(e) => handleDragOver(e, quadrant.id)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, quadrant.id)}
                  >
                    <h2>{quadrant.name}</h2>
                    <p>{quadrant.action}</p>
                    
                    <div className="task-list">
                      {quadrantTasks.map((task, index) => (
                        <div 
                          key={task.id} 
                          className="task-item" 
                          data-task-id={task.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, task.id, quadrant.id)}
                          onDragEnd={handleDragEnd}
                          title="Drag to move or reorder"
                        >
                          <div className="task-content">
                            <button 
                              className="complete-btn"
                              onClick={() => completeTask(task.id)}
                              title="Mark as complete"
                            >
                              ✓
                            </button>
                            {editingTaskId === task.id ? (
                              <div className="task-edit">
                                <input
                                  type="text"
                                  value={newTaskInputs[task.id]?.title || task.title}
                                  onChange={(e) => setNewTaskInputs(prev => ({ 
                                    ...prev, 
                                    [task.id]: { 
                                      ...prev[task.id], 
                                      title: e.target.value 
                                    } 
                                  }))}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      updateTask(task.id, newTaskInputs[task.id] || { title: task.title, dueDate: '', reminderAt: '', tags: '' });
                                    } else if (e.key === 'Escape') {
                                      e.preventDefault();
                                      cancelEdit();
                                    }
                                  }}
                                  onBlur={() => updateTask(task.id, newTaskInputs[task.id] || { title: task.title, dueDate: '', reminderAt: '', tags: '' })}
                                  autoFocus
                                  className="task-input"
                                />
                                {errorMessages[task.id] && (
                                  <div className="error-message">{errorMessages[task.id]}</div>
                                )}
                              </div>
                            ) : (
                              <div className="task-info">
                                <div 
                                  className="task-title"
                                  onClick={() => {
                                    setEditingTaskId(task.id);
                                    setNewTaskInputs(prev => ({ 
                                      ...prev, 
                                      [task.id]: { 
                                        title: task.title, 
                                        dueDate: task.dueDate || '', 
                                        reminderAt: task.reminderAt || '', 
                                        tags: task.tags.join(', '),
                                        recurrence: task.recurrence || 'none'
                                      } 
                                    }));
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                      e.preventDefault();
                                      setKeyboardMoveState({ taskId: task.id, isOpen: true });
                                    }
                                  }}
                                  tabIndex={0}
                                  role="button"
                                  aria-label={`Edit task: ${task.title}`}
                                >
                                  {task.title}
                                </div>
                                <div className="task-meta">
                                  {task.dueDate && (
                                    <div className={`task-due-date ${isOverdue(task.dueDate) ? 'overdue' : ''}`}>
                                      {isOverdue(task.dueDate) && <span className="overdue-badge">⚠️</span>}
                                      📅 {formatDueDate(task.dueDate)}
                                    </div>
                                  )}
                                  {task.recurrence !== 'none' && (
                                    <div className="task-recurrence" title={`Repeats ${task.recurrence}`}>
                                      🔄
                                    </div>
                                  )}
                                </div>
                                {task.tags.length > 0 && (
                                  <div className="task-tags">
                                    {task.tags.map(tag => (
                                      <span 
                                        key={tag} 
                                        className="task-tag"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setActiveTagFilter(tag);
                                        }}
                                      >
                                        #{tag}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                            <button 
                              className="delete-btn-small"
                              onClick={() => setDeleteConfirmTaskId(task.id)}
                              title="Delete task permanently"
                            >
                              🗑️
                            </button>
                          </div>
                          
                          {/* Delete Confirmation */}
                          {deleteConfirmTaskId === task.id && (
                            <div className="delete-confirmation">
                              <p>Delete "{task.title}" permanently?</p>
                              <div className="delete-actions">
                                <button 
                                  className="confirm-delete-btn"
                                  onClick={() => deleteTask(task.id)}
                                >
                                  Delete
                                </button>
                                <button 
                                  className="cancel-delete-btn"
                                  onClick={() => setDeleteConfirmTaskId(null)}
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}
                          
                          {/* Keyboard Move Menu */}
                          {keyboardMoveState.taskId === task.id && keyboardMoveState.isOpen && (
                            <div className="keyboard-move-menu">
                              <div className="move-section">
                                <h4>Move to:</h4>
                                {quadrants.map(q => (
                                  <button
                                    key={q.id}
                                    onClick={() => handleKeyboardMove(task.id, q.id)}
                                    className={q.id === quadrant.id ? 'current' : ''}
                                  >
                                    {q.name}
                                  </button>
                                ))}
                              </div>
                              <div className="move-section">
                                <h4>Reorder:</h4>
                                <button onClick={() => handleKeyboardMove(task.id, quadrant.id, 'up')}>
                                  ↑ Move Up
                                </button>
                                <button onClick={() => handleKeyboardMove(task.id, quadrant.id, 'down')}>
                                  ↓ Move Down
                                </button>
                              </div>
                              <button 
                                className="close-menu"
                                onClick={() => setKeyboardMoveState({ taskId: null, isOpen: false })}
                              >
                                ✕ Close
                              </button>
                            </div>
                          )}
                          
                          {/* Drop indicator */}
                          {isDragOver && dragOverIndex === index && (
                            <div className="drop-indicator" />
                          )}
                        </div>
                      ))}
                      
                      {/* Drop indicator at end */}
                      {isDragOver && dragOverIndex === quadrantTasks.length && (
                        <div className="drop-indicator" />
                      )}
                      
                      {isAddingTask ? (
                        <div className="task-form">
                          <input
                            type="text"
                            value={newTaskInputs[quadrant.id]?.title || ''}
                            onChange={(e) => setNewTaskInputs(prev => ({ 
                              ...prev, 
                              [quadrant.id]: { 
                                ...prev[quadrant.id], 
                                title: e.target.value 
                              } 
                            }))}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                addTask(quadrant.id);
                              } else if (e.key === 'Escape') {
                                e.preventDefault();
                                setShowTaskForm(null);
                                const { [quadrant.id]: removed, ...rest } = newTaskInputs;
                                setNewTaskInputs(rest);
                              }
                            }}
                            placeholder="Task title..."
                            className="task-input"
                            autoFocus
                          />
                          <div className="task-form-row">
                            <input
                              type="date"
                              value={newTaskInputs[quadrant.id]?.dueDate || ''}
                              onChange={(e) => setNewTaskInputs(prev => ({ 
                                ...prev, 
                                [quadrant.id]: { 
                                  ...prev[quadrant.id], 
                                  dueDate: e.target.value 
                                } 
                              }))}
                              className="task-date-input"
                              title="Due date"
                            />
                          </div>
                          <div className="task-form-row">
                            <input
                              type="text"
                              value={newTaskInputs[quadrant.id]?.tags || ''}
                              onChange={(e) => setNewTaskInputs(prev => ({ 
                                ...prev, 
                                [quadrant.id]: { 
                                  ...prev[quadrant.id], 
                                  tags: e.target.value 
                                } 
                              }))}
                              placeholder="Tags (comma-separated)..."
                              className="task-tags-input"
                            />
                          </div>
                          <div className="task-form-actions">
                            <button 
                              className="save-task-btn"
                              onClick={() => addTask(quadrant.id)}
                            >
                              Save
                            </button>
                            <button 
                              className="cancel-task-btn"
                              onClick={() => {
                                setShowTaskForm(null);
                                const { [quadrant.id]: removed, ...rest } = newTaskInputs;
                                setNewTaskInputs(rest);
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                          {errorMessages[quadrant.id] && (
                            <div className="error-message">{errorMessages[quadrant.id]}</div>
                          )}
                        </div>
                      ) : (
                        <button 
                          className="add-task-btn"
                          onClick={() => {
                            setShowTaskForm(quadrant.id);
                            setNewTaskInputs(prev => ({ 
                              ...prev, 
                              [quadrant.id]: { title: '', dueDate: '', tags: '', recurrence: 'none' } 
                            }));
                          }}
                        >
                          + Add Task
                        </button>
                      )}
                    </div>
                    
                    {quadrantTasks.length === 0 && !isAddingTask && (
                      <div className="empty-state">
                        <p>No tasks yet</p>
                        <p>Click "Add Task" to get started</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </main>
        </>
      )}

      {showArchive && (
        <main className="archive-container">
          <div className="archive-header">
            <h2>Archive - {activeBoard?.name}</h2>
            <p>{completedTasks.length} completed task{completedTasks.length !== 1 ? 's' : ''}</p>
            
            <div className="archive-controls">
              <div className="archive-sort">
                <label htmlFor="archive-sort">Sort by:</label>
                <select
                  id="archive-sort"
                  value={archiveSortType}
                  onChange={(e) => setArchiveSortType(e.target.value as ArchiveSortType)}
                  className="archive-sort-select"
                >
                  <option value="date">Date Completed</option>
                  <option value="quadrant">Original Quadrant</option>
                  <option value="title">Task Title</option>
                </select>
              </div>
              
              {archiveTags.length > 0 && (
                <div className="archive-tag-filter">
                  <label htmlFor="archive-tag-filter">Filter by tag:</label>
                  <select
                    id="archive-tag-filter"
                    value={archiveTagFilter || ''}
                    onChange={(e) => setArchiveTagFilter(e.target.value || null)}
                    className="archive-tag-filter-select"
                  >
                    <option value="">All Tags</option>
                    {archiveTags.map(tag => (
                      <option key={tag} value={tag}>{tag}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
          
          {completedTasks.length === 0 ? (
            <div className="archive-empty">
              <p>No completed tasks yet</p>
              <p>Complete some tasks to see them here</p>
            </div>
          ) : (
            <div className="archive-list">
              {Object.entries(groupedCompletedTasks).map(([date, tasks]) => (
                <div key={date} className="archive-group">
                  <h3 className="archive-date">{date}</h3>
                  {tasks.map(task => (
                    <div key={task.id} className="archive-item">
                      <div className="archive-task-info">
                        <div className="archive-task-title">{task.title}</div>
                        <div className="archive-task-meta">
                          <span className="archive-quadrant">{getQuadrantName(task.quadrantId)}</span>
                          <span className="archive-time">{formatDate(task.completedAt || 0)}</span>
                        </div>
                        {task.tags.length > 0 && (
                          <div className="archive-task-tags">
                            {task.tags.map(tag => (
                              <span key={tag} className="archive-task-tag">#{tag}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="archive-actions">
                        <button 
                          className="restore-btn"
                          onClick={() => restoreTask(task.id)}
                          title="Restore to original quadrant"
                        >
                          ↶ Restore
                        </button>
                        <button 
                          className="delete-btn"
                          onClick={() => setDeleteConfirmTaskId(task.id)}
                          title="Delete permanently"
                        >
                          🗑️ Delete
                        </button>
                      </div>
                      
                      {/* Delete Confirmation for Archive */}
                      {deleteConfirmTaskId === task.id && (
                        <div className="delete-confirmation archive-delete">
                          <p>Delete "{task.title}" permanently from archive?</p>
                          <div className="delete-actions">
                            <button 
                              className="confirm-delete-btn"
                              onClick={() => deleteTask(task.id)}
                            >
                              Delete
                            </button>
                            <button 
                              className="cancel-delete-btn"
                              onClick={() => setDeleteConfirmTaskId(null)}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </main>
      )}
      

      
      {/* Merge Prompt Modal */}
      {/* This component is no longer used as per the new_code, but keeping it for now */}
      {/* <MergePromptModal
        isOpen={showMergePrompt}
        onMerge={mergeLocalData}
        onSkip={skipMerge}
      /> */}
    </div>
  )
}

export default App
