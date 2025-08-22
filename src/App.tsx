import { useState, useEffect, useRef } from 'react'
import './App.css'

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

interface DragState {
  taskId: string | null;
  sourceQuadrant: string | null;
  isDragging: boolean;
}

interface KeyboardMoveState {
  taskId: string | null;
  isOpen: boolean;
}

interface TaskFormData {
  title: string;
  dueDate: string;
  reminderAt: string;
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
  const [boards, setBoards] = useState<Board[]>([]);
  const [activeBoardId, setActiveBoardId] = useState<string>('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [newTaskInputs, setNewTaskInputs] = useState<{ [key: string]: TaskFormData }>({});
  const [errorMessages, setErrorMessages] = useState<{ [key: string]: string }>({});
  const [showArchive, setShowArchive] = useState(false);
  const [dragState, setDragState] = useState<DragState>({
    taskId: null,
    sourceQuadrant: null,
    isDragging: false
  });
  const [keyboardMoveState, setKeyboardMoveState] = useState<KeyboardMoveState>({
    taskId: null,
    isOpen: false
  });
  const [dragOverQuadrant, setDragOverQuadrant] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [deleteConfirmTaskId, setDeleteConfirmTaskId] = useState<string | null>(null);
  const [activeTagFilter, setActiveTagFilter] = useState<string | null>(null);
  const [showTaskForm, setShowTaskForm] = useState<string | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showSearchOverlay, setShowSearchOverlay] = useState(false);
  
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

  const showNotification = (task: Task) => {
    if (notificationPermission === 'granted' && 'Notification' in window) {
      const board = boards.find(b => b.id === task.boardId);
      new Notification('Task Reminder', {
        body: `${task.title} - ${board?.name || 'Unknown Board'}`,
        icon: '/favicon.ico',
        tag: task.id
      });
    }
  };

  // Theme utility functions
  const getThemeClass = () => {
    return `theme-${theme.mode} theme-accent-${theme.accent}`;
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

  const createNewBoard = () => {
    const boardName = prompt('Enter board name:');
    if (boardName && boardName.trim()) {
      const newBoard: Board = {
        id: Date.now().toString(),
        name: boardName.trim()
      };
      setBoards([...boards, newBoard]);
      setActiveBoardId(newBoard.id);
    }
  };

  const getTasksForQuadrant = (quadrantId: string) => {
    let filteredTasks = tasks
      .filter(task => 
        task.boardId === activeBoardId && 
        task.quadrantId === quadrantId && 
        !task.completed
      );

    // Apply tag filter if active
    if (activeTagFilter) {
      filteredTasks = filteredTasks.filter(task => 
        task.tags.includes(activeTagFilter)
      );
    }

    return filteredTasks.sort((a, b) => a.order - b.order);
  };

  const getCompletedTasks = () => {
    let filteredTasks = tasks.filter(task => 
      task.boardId === activeBoardId && 
      task.completed
    );

    // Apply archive tag filter
    if (archiveTagFilter) {
      filteredTasks = filteredTasks.filter(task => 
        task.tags.includes(archiveTagFilter)
      );
    }

    // Sort based on archive sort type
    switch (archiveSortType) {
      case 'date':
        return filteredTasks.sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0));
      case 'quadrant':
        return filteredTasks.sort((a, b) => a.quadrantId.localeCompare(b.quadrantId));
      case 'title':
        return filteredTasks.sort((a, b) => a.title.localeCompare(b.title));
      default:
        return filteredTasks.sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0));
    }
  };

  const getNextOrder = (quadrantId: string) => {
    const quadrantTasks = getTasksForQuadrant(quadrantId);
    return quadrantTasks.length > 0 ? Math.max(...quadrantTasks.map(t => t.order)) + 1 : 0;
  };

  const getAllTags = () => {
    const allTags = new Set<string>();
    tasks
      .filter(task => task.boardId === activeBoardId && !task.completed)
      .forEach(task => {
        task.tags.forEach(tag => allTags.add(tag));
      });
    return Array.from(allTags).sort();
  };

  const getArchiveTags = () => {
    const allTags = new Set<string>();
    tasks
      .filter(task => task.boardId === activeBoardId && task.completed)
      .forEach(task => {
        task.tags.forEach(tag => allTags.add(tag));
      });
    return Array.from(allTags).sort();
  };

  const parseTags = (tagsString: string): string[] => {
    return tagsString
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);
  };

  const addTask = (quadrantId: string) => {
    const formData = newTaskInputs[quadrantId];
    if (!formData) return;

    const title = formData.title.trim();
    if (!title) {
      setErrorMessages(prev => ({ ...prev, [quadrantId]: 'Task title is required' }));
      return;
    }

    const newTask: Task = {
      id: Date.now().toString(),
      boardId: activeBoardId,
      quadrantId,
      title,
      createdAt: Date.now(),
      completed: false,
      order: getNextOrder(quadrantId),
      dueDate: formData.dueDate || null,
      reminderAt: formData.reminderAt || null,
      tags: parseTags(formData.tags),
      recurrence: formData.recurrence || 'none'
    };

    setTasks([...tasks, newTask]);
    const { [quadrantId]: removed, ...rest } = newTaskInputs;
    setNewTaskInputs(rest);
    setErrorMessages(prev => ({ ...prev, [quadrantId]: '' }));
    setShowTaskForm(null);
  };

  const updateTask = (taskId: string, formData: TaskFormData) => {
    const trimmedTitle = formData.title.trim();
    
    if (!trimmedTitle) {
      setErrorMessages(prev => ({ ...prev, [taskId]: 'Task title is required' }));
      return;
    }

    setTasks(tasks.map(task => 
      task.id === taskId ? { 
        ...task, 
        title: trimmedTitle,
        dueDate: formData.dueDate || null,
        reminderAt: formData.reminderAt || null,
        tags: parseTags(formData.tags),
        recurrence: formData.recurrence || 'none'
      } : task
    ));
    setEditingTaskId(null);
    setErrorMessages(prev => ({ ...prev, [taskId]: '' }));
    setShowTaskForm(null);
  };

  const completeTask = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    // Mark task as completed
    setTasks(tasks.map(t => 
      t.id === taskId ? { 
        ...t, 
        completed: true, 
        completedAt: Date.now() 
      } : t
    ));

    // Create next recurring instance if applicable
    if (task.recurrence !== 'none' && task.dueDate) {
      const currentDueDate = new Date(task.dueDate);
      let nextDueDate = new Date(currentDueDate);
      
      switch (task.recurrence) {
        case 'daily':
          nextDueDate.setDate(nextDueDate.getDate() + 1);
          break;
        case 'weekly':
          nextDueDate.setDate(nextDueDate.getDate() + 7);
          break;
        case 'monthly':
          nextDueDate.setMonth(nextDueDate.getMonth() + 1);
          break;
      }

      const nextTask: Task = {
        ...task,
        id: Date.now().toString(),
        completed: false,
        completedAt: undefined,
        dueDate: nextDueDate.toISOString().split('T')[0],
        order: getNextOrder(task.quadrantId),
        createdAt: Date.now()
      };

      setTasks(prev => [...prev, nextTask]);
    }
  };

  const deleteTask = (taskId: string) => {
    setTasks(tasks.filter(task => task.id !== taskId));
    setDeleteConfirmTaskId(null);
  };

  const restoreTask = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    setTasks(tasks.map(t => 
      t.id === taskId ? { 
        ...t, 
        completed: false,
        completedAt: undefined,
        order: getNextOrder(task.quadrantId)
      } : t
    ));
  };

  const isOverdue = (dueDate: string | null | undefined) => {
    if (!dueDate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    return due < today;
  };

  const formatDueDate = (dueDate: string) => {
    const date = new Date(dueDate);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Reset time for comparison
    today.setHours(0, 0, 0, 0);
    tomorrow.setHours(0, 0, 0, 0);
    const dueDateOnly = new Date(date);
    dueDateOnly.setHours(0, 0, 0, 0);
    
    if (dueDateOnly.getTime() === today.getTime()) {
      return 'Today';
    } else if (dueDateOnly.getTime() === tomorrow.getTime()) {
      return 'Tomorrow';
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

  const formatReminderTime = (reminderAt: string) => {
    const date = new Date(reminderAt);
    return date.toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const handleSearchResultClick = (result: SearchResult) => {
    if (result.isArchived) {
      setShowArchive(true);
      setSearchQuery('');
      setShowSearchResults(false);
    } else {
      // Find the task element and scroll to it
      const taskElement = document.querySelector(`[data-task-id="${result.task.id}"]`);
      if (taskElement) {
        taskElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Add highlight effect
        taskElement.classList.add('search-highlight');
        setTimeout(() => {
          taskElement.classList.remove('search-highlight');
        }, 2000);
      }
      setSearchQuery('');
      setShowSearchResults(false);
    }
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

  const handleDrop = (e: React.DragEvent, targetQuadrantId: string, targetIndex?: number) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    
    if (!taskId || !dragState.taskId) return;

    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

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
    const finalTasks = updatedTasks.map(t => {
      if (t.quadrantId === dragState.sourceQuadrant && !t.completed && t.boardId === activeBoardId) {
        const sourceTasks = updatedTasks.filter(task => 
          task.quadrantId === dragState.sourceQuadrant && 
          !task.completed && 
          task.boardId === activeBoardId &&
          task.id !== taskId
        ).sort((a, b) => a.order - b.order);
        
        const sourceIndex = sourceTasks.findIndex(task => task.id === t.id);
        if (sourceIndex !== -1) {
          return { ...t, order: sourceIndex };
        }
      }
      return t;
    });

    setTasks(finalTasks);
    setDragState({ taskId: null, sourceQuadrant: null, isDragging: false });
    setDragOverQuadrant(null);
    setDragOverIndex(null);
  };

  // Keyboard Move Functions
  const handleKeyboardMove = (taskId: string, targetQuadrantId: string, direction?: 'up' | 'down') => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    if (direction) {
      // Move up/down within same quadrant
      const quadrantTasks = getTasksForQuadrant(task.quadrantId);
      const currentIndex = quadrantTasks.findIndex(t => t.id === taskId);
      const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      
      if (targetIndex >= 0 && targetIndex < quadrantTasks.length) {
        const targetTask = quadrantTasks[targetIndex];
        setTasks(tasks.map(t => {
          if (t.id === taskId) return { ...t, order: targetTask.order };
          if (t.id === targetTask.id) return { ...t, order: task.order };
          return t;
        }));
      }
    } else {
      // Move to different quadrant
      const newOrder = getNextOrder(targetQuadrantId);
      setTasks(tasks.map(t => {
        if (t.id === taskId) {
          return { ...t, quadrantId: targetQuadrantId, order: newOrder };
        }
        return t;
      }));
    }
    
    setKeyboardMoveState({ taskId: null, isOpen: false });
  };

  const cancelEdit = () => {
    setEditingTaskId(null);
    setErrorMessages({});
    setShowTaskForm(null);
  };

  const handleKeyPress = (event: React.KeyboardEvent, action: () => void) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      action();
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      cancelEdit();
      setKeyboardMoveState({ taskId: null, isOpen: false });
      setDeleteConfirmTaskId(null);
      setShowSearchResults(false);
      setShowSearchOverlay(false);
    }
  };

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
            </div>
          )}
        </div>
      </header>
      
      {!showArchive && (
        <>
          <div className="board-switcher">
            <div className="board-list">
              {boards.map(board => (
                <button
                  key={board.id}
                  className={`board-chip ${board.id === activeBoardId ? 'active' : ''}`}
                  onClick={() => setActiveBoardId(board.id)}
                >
                  {board.name}
                </button>
              ))}
            </div>
            <button className="new-board-btn" onClick={createNewBoard}>
              + New Board
            </button>
          </div>

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
                        <div key={task.id} className="task-item" data-task-id={task.id}>
                          <div className="task-content">
                            <button 
                              className="complete-btn"
                              onClick={() => completeTask(task.id)}
                              title="Mark as complete"
                            >
                              ✓
                            </button>
                            <div 
                              className="task-drag-handle"
                              draggable
                              onDragStart={(e) => handleDragStart(e, task.id, quadrant.id)}
                              title="Drag to move or reorder"
                            >
                              ⋮⋮
                            </div>
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
                                  onKeyPress={(e) => handleKeyPress(e, () => updateTask(task.id, newTaskInputs[task.id] || { title: task.title, dueDate: '', reminderAt: '', tags: '' }))}
                                  onKeyDown={handleKeyDown}
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
                                  {task.reminderAt && (
                                    <div className="task-reminder" title={`Reminder: ${formatReminderTime(task.reminderAt)}`}>
                                      🔔
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
                            placeholder="Task title..."
                            className="task-input"
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
                            <input
                              type="datetime-local"
                              value={newTaskInputs[quadrant.id]?.reminderAt || ''}
                              onChange={(e) => setNewTaskInputs(prev => ({ 
                                ...prev, 
                                [quadrant.id]: { 
                                  ...prev[quadrant.id], 
                                  reminderAt: e.target.value 
                                } 
                              }))}
                              className="task-reminder-input"
                              title="Reminder"
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
                            <select
                              value={newTaskInputs[quadrant.id]?.recurrence || 'none'}
                              onChange={(e) => setNewTaskInputs(prev => ({ 
                                ...prev, 
                                [quadrant.id]: { 
                                  ...prev[quadrant.id], 
                                  recurrence: e.target.value as 'none' | 'daily' | 'weekly' | 'monthly'
                                } 
                              }))}
                              className="task-recurrence-select"
                            >
                              <option value="none">No Recurrence</option>
                              <option value="daily">Daily</option>
                              <option value="weekly">Weekly</option>
                              <option value="monthly">Monthly</option>
                            </select>
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
                              [quadrant.id]: { title: '', dueDate: '', reminderAt: '', tags: '', recurrence: 'none' } 
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
    </div>
  )
}

export default App
